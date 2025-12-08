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
 * - Configurable manifest path via ROSETTA_MANIFEST_PATH env var
 *
 * Usage in next.config.ts:
 * ```ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 * export default withRosetta(nextConfig);
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================
// Configuration
// ============================================

const MANIFEST_DIR = process.env.ROSETTA_MANIFEST_DIR ?? '.rosetta';
const MANIFEST_FILE = 'manifest.json';

function getManifestDir(): string {
	return path.join(process.cwd(), MANIFEST_DIR);
}

function getManifestPath(): string {
	return path.join(getManifestDir(), MANIFEST_FILE);
}

// ============================================
// Hash Function
// ============================================

/**
 * DJB2 hash with 33 multiplier - inlined to avoid external dependency
 */
function djb33x(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return hash >>> 0;
}

function hashText(text: string): string {
	return djb33x(text.trim()).toString(16).padStart(8, '0');
}

// ============================================
// Manifest Entry Type
// ============================================

interface ManifestEntry {
	text: string;
	hash: string;
}

// ============================================
// State Management
// ============================================

// Shared state across loader invocations within the same build
const collectedStrings = new Map<string, ManifestEntry>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DEBOUNCE_MS = 100;

// ============================================
// Regex Extraction
// ============================================

// Regex to match t() calls with string literals
// Matches: t('string'), t("string"), t(`string`), t('string', { ... })
const T_CALL_REGEX = /\bt\s*\(\s*(['"`])(.+?)\1(?:\s*,\s*\{[^}]*\})?\s*\)/g;

/**
 * Extract t() calls from source code
 */
function extractStrings(source: string): ManifestEntry[] {
	const strings: ManifestEntry[] = [];
	const seen = new Set<string>();

	T_CALL_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = T_CALL_REGEX.exec(source)) !== null) {
		const text = match[2];

		// Skip if already seen, has template expressions, or is empty
		if (!text || seen.has(text) || text.includes('${') || !text.trim()) {
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
