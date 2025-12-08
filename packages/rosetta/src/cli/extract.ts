/**
 * Compile-time string extraction
 *
 * Scans source files for t() calls and extracts strings.
 * Works with both server t() and client useT() -> t() patterns.
 */

import { hashText } from '../hash';
import type { PendingSourceString } from '../types';

export interface ExtractOptions {
	/** Glob patterns for source files */
	include?: string[];
	/** Glob patterns to exclude */
	exclude?: string[];
	/** Root directory to scan */
	root?: string;
	/** Whether to output verbose logs */
	verbose?: boolean;
}

export interface ExtractResult {
	/** Extracted strings */
	strings: PendingSourceString[];
	/** Files scanned */
	filesScanned: number;
	/** Errors encountered */
	errors: Array<{ file: string; error: string }>;
}

/**
 * Extract t() calls from source code using regex
 *
 * Matches patterns like:
 * - t('string')
 * - t("string")
 * - t(`string`)
 * - t('string', { context: 'ctx' })
 * - t('string with {param}')
 */
const T_CALL_REGEX = /\bt\s*\(\s*(['"`])(.+?)\1(?:\s*,\s*\{[^}]*\})?\s*\)/g;

/**
 * Extract strings from a single file's content
 */
export function extractFromSource(content: string, filename: string): PendingSourceString[] {
	const strings: PendingSourceString[] = [];
	const seen = new Set<string>();

	// Reset regex state
	T_CALL_REGEX.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = T_CALL_REGEX.exec(content)) !== null) {
		const text = match[2];

		// Skip if already seen in this file
		if (seen.has(text)) continue;
		seen.add(text);

		// Skip template literals with expressions
		if (text.includes('${')) continue;

		// Skip empty strings
		if (!text.trim()) continue;

		const hash = hashText(text);
		strings.push({ text, hash });
	}

	return strings;
}

/**
 * Extract all strings from a codebase
 */
export async function extract(options: ExtractOptions = {}): Promise<ExtractResult> {
	const {
		include = ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js'],
		exclude = [
			'**/node_modules/**',
			'**/.next/**',
			'**/dist/**',
			'**/*.d.ts',
			'**/*.test.*',
			'**/*.spec.*',
		],
		root = process.cwd(),
		verbose = false,
	} = options;

	const result: ExtractResult = {
		strings: [],
		filesScanned: 0,
		errors: [],
	};

	const seenHashes = new Set<string>();
	const processedFiles = new Set<string>();

	// Process each include pattern
	for (const pattern of include) {
		const glob = new Bun.Glob(pattern);

		for await (const file of glob.scan({ cwd: root, onlyFiles: true })) {
			// Skip already processed
			if (processedFiles.has(file)) continue;
			processedFiles.add(file);

			// Check exclusions
			const shouldExclude = exclude.some((excludePattern) => {
				const excludeGlob = new Bun.Glob(excludePattern);
				return excludeGlob.match(file);
			});

			if (shouldExclude) continue;

			try {
				const fullPath = `${root}/${file}`;
				const content = await Bun.file(fullPath).text();

				const extracted = extractFromSource(content, file);
				result.filesScanned++;

				for (const str of extracted) {
					if (!seenHashes.has(str.hash)) {
						seenHashes.add(str.hash);
						result.strings.push(str);
					}
				}

				if (verbose && extracted.length > 0) {
					console.log(`  ${file}: ${extracted.length} strings`);
				}
			} catch (error) {
				result.errors.push({
					file,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	return result;
}

/**
 * Format extraction result for display
 */
export function formatResult(result: ExtractResult): string {
	const lines: string[] = [];

	lines.push(`Scanned ${result.filesScanned} files`);
	lines.push(`Found ${result.strings.length} unique strings`);

	if (result.errors.length > 0) {
		lines.push(`\nErrors (${result.errors.length}):`);
		for (const { file, error } of result.errors) {
			lines.push(`  ${file}: ${error}`);
		}
	}

	return lines.join('\n');
}
