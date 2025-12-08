/**
 * Rosetta Turbopack/Webpack Loader
 *
 * Extracts t() calls from source files during build.
 * Writes extracted strings to .rosetta/manifest.json
 *
 * Features:
 * - Atomic writes (temp file + rename)
 * - Debounced writes (100ms) to batch multiple file changes
 * - Hash collision detection
 * - Sorted output for deterministic diffs
 * - Configurable manifest path via ROSETTA_MANIFEST_DIR env var
 * - Context-aware hashing (matches runtime behavior)
 * - ReDoS-safe regex patterns
 *
 * Usage in next.config.ts:
 * ```ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 * export default withRosetta(nextConfig);
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';
import { hashText } from '@sylphx/rosetta';

// ============================================
// Configuration
// ============================================

const MANIFEST_DIR = process.env.ROSETTA_MANIFEST_DIR ?? '.rosetta';
const MANIFEST_FILE = 'manifest.json';

function getManifestDir(): string {
	const dir = MANIFEST_DIR;

	// Security: Validate path to prevent traversal attacks
	if (dir.includes('..') || path.isAbsolute(dir)) {
		throw new Error(
			`[rosetta] ROSETTA_MANIFEST_DIR must be a relative path without ".."\n  Got: ${dir}`
		);
	}

	return path.join(process.cwd(), dir);
}

function getManifestPath(): string {
	return path.join(getManifestDir(), MANIFEST_FILE);
}

// ============================================
// Manifest Entry Type
// ============================================

interface ManifestEntry {
	text: string;
	hash: string;
	context?: string;
}

// ============================================
// State Management
// ============================================

// Shared state across loader invocations within the same build
const collectedStrings = new Map<string, ManifestEntry>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DEBOUNCE_MS = 100;
const MAX_COLLECTED_STRINGS = 100000; // Memory safety limit

// ============================================
// Regex Extraction (ReDoS-safe)
// ============================================

// ReDoS-safe regex patterns with bounded repetition
// Matches: t('string'), t("string"), t(`string`)
const T_CALL_SIMPLE_REGEX = /\bt\s{0,10}\(\s{0,10}(['"`])([^'"`\n]{1,10000})\1\s{0,10}\)/g;

// Matches: t('string', { context: 'value' }) or t('string', { ...options })
// Bounded to 500 chars for options object to prevent ReDoS
const T_CALL_WITH_OPTIONS_REGEX =
	/\bt\s{0,10}\(\s{0,10}(['"`])([^'"`\n]{1,10000})\1\s{0,10},\s{0,10}\{([^}]{0,500})\}\s{0,10}\)/g;

// Extract context from options object
const CONTEXT_REGEX = /context\s{0,5}:\s{0,5}['"`]([^'"`]{1,200})['"`]/;

/**
 * Extract t() calls from source code
 * Supports context extraction for disambiguation
 */
function extractStrings(source: string): ManifestEntry[] {
	const strings: ManifestEntry[] = [];
	const seen = new Set<string>(); // key = text + context

	// Early return for files without t() calls (performance optimization)
	if (!source.includes('t(')) {
		return strings;
	}

	// First pass: t() calls with options (may have context)
	T_CALL_WITH_OPTIONS_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = T_CALL_WITH_OPTIONS_REGEX.exec(source)) !== null) {
		const text = match[2];
		const optionsStr = match[3];

		// Skip template expressions or empty
		if (!text || text.includes('${') || !text.trim()) {
			continue;
		}

		// Extract context if present
		let context: string | undefined;
		if (optionsStr) {
			const contextMatch = CONTEXT_REGEX.exec(optionsStr);
			if (contextMatch) {
				context = contextMatch[1];
			}
		}

		// Create unique key for deduplication
		const key = context ? `${context}::${text}` : text;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		const hash = hashText(text, context);
		strings.push({ text, hash, context });
	}

	// Second pass: simple t() calls without options
	T_CALL_SIMPLE_REGEX.lastIndex = 0;

	while ((match = T_CALL_SIMPLE_REGEX.exec(source)) !== null) {
		const text = match[2];

		// Skip template expressions or empty
		if (!text || text.includes('${') || !text.trim()) {
			continue;
		}

		// Skip if already seen (from options pass)
		if (seen.has(text)) {
			continue;
		}

		seen.add(text);
		const hash = hashText(text);
		strings.push({ text, hash });
	}

	return strings;
}

// ============================================
// Atomic Manifest Write
// ============================================

/**
 * Write manifest atomically (temp file + rename)
 * Also detects hash collisions and sorts output for deterministic diffs
 */
function writeManifestAtomic(): void {
	try {
		const manifestDir = getManifestDir();
		const manifestPath = getManifestPath();
		const tempPath = `${manifestPath}.tmp`;

		// Ensure directory exists
		if (!fs.existsSync(manifestDir)) {
			fs.mkdirSync(manifestDir, { recursive: true });
		}

		// Read existing manifest to merge
		let existing: ManifestEntry[] = [];
		if (fs.existsSync(manifestPath)) {
			try {
				const content = fs.readFileSync(manifestPath, 'utf-8');
				const parsed = JSON.parse(content);
				if (Array.isArray(parsed)) {
					existing = parsed;
				}
			} catch {
				// Ignore parse errors, start fresh
			}
		}

		// Merge with existing (detect collisions)
		const merged = new Map<string, ManifestEntry>();
		const collisions: Array<{ hash: string; existing: string; new: string }> = [];

		// Add existing entries
		for (const item of existing) {
			if (item.hash && item.text) {
				merged.set(item.hash, item);
			}
		}

		// Add new entries, detecting collisions
		for (const [hash, item] of collectedStrings) {
			const existingItem = merged.get(hash);
			if (existingItem && existingItem.text !== item.text) {
				collisions.push({
					hash,
					existing: existingItem.text,
					new: item.text,
				});
			}
			merged.set(hash, item);
		}

		// Warn about hash collisions
		if (collisions.length > 0) {
			console.warn('[rosetta] ⚠️ Hash collisions detected:');
			for (const c of collisions) {
				console.warn(`  Hash ${c.hash}: "${c.existing}" vs "${c.new}"`);
			}
		}

		// Sort by hash for deterministic output
		const data = Array.from(merged.values()).sort((a, b) => a.hash.localeCompare(b.hash));

		// Write to temp file first
		fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));

		// Atomic rename (POSIX guarantees atomicity for rename)
		fs.renameSync(tempPath, manifestPath);

		// Clear collected strings after successful write
		collectedStrings.clear();
	} catch (error) {
		console.error('[rosetta] Failed to write manifest:', error);
		// Don't throw - build should continue even if manifest write fails
	}
}

/**
 * Schedule manifest write with debouncing
 * Waits 100ms for additional changes before writing
 */
function scheduleManifestWrite(): void {
	// Clear existing timer
	if (writeTimer) {
		clearTimeout(writeTimer);
	}

	// Schedule new write
	writeTimer = setTimeout(() => {
		writeManifestAtomic();
		writeTimer = null;
	}, WRITE_DEBOUNCE_MS);
}

// ============================================
// Loader Export
// ============================================

/**
 * Rosetta loader - extracts t() calls and writes to manifest
 */
export default function rosettaLoader(source: string): string {
	const strings = extractStrings(source);

	// Add to collected strings
	for (const item of strings) {
		collectedStrings.set(item.hash, item);
	}

	// Memory safety: flush if too many strings accumulated
	if (collectedStrings.size > MAX_COLLECTED_STRINGS) {
		console.warn('[rosetta] Max strings limit reached, flushing to disk');
		writeManifestAtomic();
	}

	// Schedule manifest write if we found strings
	if (strings.length > 0) {
		scheduleManifestWrite();
	}

	// Return source unchanged (we're just extracting, not transforming)
	return source;
}

// ============================================
// Utility Exports
// ============================================

/**
 * Get the manifest path (for external tools)
 */
export { getManifestPath };

/**
 * Read strings from manifest
 */
export function readManifest(): ManifestEntry[] {
	const manifestPath = getManifestPath();

	if (!fs.existsSync(manifestPath)) {
		return [];
	}

	try {
		const content = fs.readFileSync(manifestPath, 'utf-8');
		const parsed = JSON.parse(content);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Clear the manifest (use with caution)
 */
export function clearManifest(): void {
	const manifestPath = getManifestPath();

	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath);
	}
}

/**
 * Force write any pending strings to manifest
 * Useful for testing or manual sync
 */
export function flushManifest(): void {
	if (writeTimer) {
		clearTimeout(writeTimer);
		writeTimer = null;
	}
	if (collectedStrings.size > 0) {
		writeManifestAtomic();
	}
}

/**
 * Reset loader state (for testing)
 */
export function resetLoaderState(): void {
	collectedStrings.clear();
	if (writeTimer) {
		clearTimeout(writeTimer);
		writeTimer = null;
	}
}
