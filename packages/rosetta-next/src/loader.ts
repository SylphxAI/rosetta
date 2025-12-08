/**
 * Rosetta Turbopack/Webpack Loader
 *
 * Extracts t() calls from source files during build.
 * Writes extracted strings to .rosetta/manifest.json
 *
 * Usage in next.config.ts:
 * ```ts
 * export default {
 *   turbopack: {
 *     rules: {
 *       '*.{ts,tsx}': {
 *         loaders: ['@sylphx/rosetta-next/loader'],
 *       },
 *     },
 *   },
 * };
 * ```
 */

import { hashText } from '@sylphx/rosetta';
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST_DIR = '.rosetta';
const MANIFEST_FILE = 'manifest.json';

// Shared state across loader invocations within the same build
const collectedStrings = new Map<string, { text: string; hash: string }>();
let writeScheduled = false;

// Regex to match t() calls with string literals
// Matches: t('string'), t("string"), t(`string`), t('string', { ... })
const T_CALL_REGEX = /\bt\s*\(\s*(['"`])(.+?)\1(?:\s*,\s*\{[^}]*\})?\s*\)/g;

/**
 * Schedule manifest write (debounced)
 */
function scheduleManifestWrite(): void {
	if (writeScheduled) return;
	writeScheduled = true;

	// Use setImmediate to batch writes across multiple loader invocations
	setImmediate(() => {
		try {
			const manifestPath = path.join(process.cwd(), MANIFEST_DIR, MANIFEST_FILE);
			const manifestDir = path.dirname(manifestPath);

			// Ensure directory exists
			if (!fs.existsSync(manifestDir)) {
				fs.mkdirSync(manifestDir, { recursive: true });
			}

			// Read existing manifest to merge
			let existing: Array<{ text: string; hash: string }> = [];
			if (fs.existsSync(manifestPath)) {
				try {
					existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
				} catch {
					// Ignore parse errors, start fresh
				}
			}

			// Merge with existing (existing takes precedence for same hash)
			const merged = new Map<string, { text: string; hash: string }>();
			for (const item of existing) {
				merged.set(item.hash, item);
			}
			for (const [hash, item] of collectedStrings) {
				merged.set(hash, item);
			}

			// Write merged manifest
			const data = Array.from(merged.values());
			fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
		} catch (error) {
			console.error('[rosetta] Failed to write manifest:', error);
		} finally {
			writeScheduled = false;
		}
	});
}

/**
 * Extract t() calls from source code
 */
function extractStrings(source: string): Array<{ text: string; hash: string }> {
	const strings: Array<{ text: string; hash: string }> = [];
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

/**
 * Rosetta loader - extracts t() calls and writes to manifest
 */
export default function rosettaLoader(source: string): string {
	const strings = extractStrings(source);

	// Add to collected strings
	for (const item of strings) {
		collectedStrings.set(item.hash, item);
	}

	// Schedule manifest write
	if (strings.length > 0) {
		scheduleManifestWrite();
	}

	// Return source unchanged (we're just extracting, not transforming)
	return source;
}

/**
 * Get the manifest path
 */
export function getManifestPath(): string {
	return path.join(process.cwd(), MANIFEST_DIR, MANIFEST_FILE);
}

/**
 * Read strings from manifest
 */
export function readManifest(): Array<{ text: string; hash: string }> {
	const manifestPath = getManifestPath();

	if (!fs.existsSync(manifestPath)) {
		return [];
	}

	try {
		return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	} catch {
		return [];
	}
}

/**
 * Clear the manifest
 */
export function clearManifest(): void {
	const manifestPath = getManifestPath();

	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath);
	}
}
