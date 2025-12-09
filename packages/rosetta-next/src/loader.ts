/**
 * Rosetta Turbopack/Webpack Loader
 *
 * Extracts t() calls from source files during build.
 * Writes extracted strings to public/rosetta/manifest.json
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

const DEFAULT_MANIFEST_DIR = 'public/rosetta';
const MANIFEST_FILE = 'manifest.json';

function getManifestDir(): string {
	// Read env at runtime (not module load time) for testability
	const dir = process.env.ROSETTA_MANIFEST_DIR ?? DEFAULT_MANIFEST_DIR;

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
	/** Source files that use this string (for route-based loading) */
	files?: string[];
}

interface RouteManifest {
	/** All extracted strings */
	strings: ManifestEntry[];
	/** Route to hash mapping for page-level loading */
	routes: Record<string, string[]>;
}

// ============================================
// State Management
// ============================================

// Shared state across loader invocations within the same build
const collectedStrings = new Map<string, ManifestEntry>();
/** Track which files use each hash (for route-based loading) */
const hashToFiles = new Map<string, Set<string>>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DEBOUNCE_MS = 100;
const MAX_COLLECTED_STRINGS = 100000; // Memory safety limit

// ============================================
// Route Detection (Next.js App Router)
// ============================================

/**
 * Convert a file path to a Next.js route
 * Supports App Router conventions:
 * - app/page.tsx → /
 * - app/about/page.tsx → /about
 * - app/products/[id]/page.tsx → /products/[id]
 * - app/(marketing)/about/page.tsx → /about (groups removed)
 * - app/[locale]/products/page.tsx → /products (locale param removed)
 *
 * Returns null for non-route files (components, utils, etc.)
 */
function filePathToRoute(filePath: string): string | null {
	// Normalize path separators
	const normalized = filePath.replace(/\\/g, '/');

	// Find app directory (App Router)
	const appMatch = normalized.match(/\/app\/(.+)$/);
	if (!appMatch) {
		// Not in app directory - might be a shared component
		// Try to detect page files in other locations
		return null;
	}

	const relativePath = appMatch[1];

	// Only process route files (page, layout, template, loading, error, not-found)
	const routeFiles = ['page', 'layout', 'template', 'loading', 'error', 'not-found', 'default'];
	const isRouteFile = routeFiles.some(
		(rf) => relativePath.endsWith(`${rf}.tsx`) || relativePath.endsWith(`${rf}.ts`)
	);

	if (!isRouteFile) {
		// Not a route file - it's a component/util that might be shared
		// We still want to track it, but associate with where it's imported
		return null;
	}

	// Extract route path
	let route = '/' + relativePath;

	// Remove file extension and route file name
	route = route.replace(/\/(page|layout|template|loading|error|not-found|default)\.(tsx?|jsx?)$/, '');

	// Remove route groups: (marketing) → ''
	route = route.replace(/\/\([^)]+\)/g, '');

	// Remove common locale param patterns: [locale], [lang]
	route = route.replace(/\/\[(locale|lang)\]/g, '');

	// Normalize root
	if (route === '' || route === '/') {
		return '/';
	}

	// Clean up double slashes
	route = route.replace(/\/+/g, '/');

	// Remove trailing slash
	route = route.replace(/\/$/, '');

	return route || '/';
}

/**
 * Get all routes that might use a shared component
 * For non-route files, we associate them with the parent route
 */
function getAssociatedRoutes(filePath: string): string[] {
	const route = filePathToRoute(filePath);
	if (route) {
		return [route];
	}

	// For shared components, try to find the nearest route
	const normalized = filePath.replace(/\\/g, '/');
	const appMatch = normalized.match(/\/app\/(.+)$/);

	if (!appMatch) {
		// Outside app directory - could be used anywhere
		// Return special marker for "global" strings
		return ['_shared'];
	}

	// Find parent directory that could be a route
	const parts = appMatch[1].split('/');
	parts.pop(); // Remove filename

	// Walk up to find route
	while (parts.length > 0) {
		const testPath = '/app/' + parts.join('/') + '/page.tsx';
		const route = filePathToRoute(testPath);
		if (route) {
			return [route];
		}
		parts.pop();
	}

	return ['_shared'];
}

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

const ROUTES_FILE = 'routes.json';

function getRoutesPath(): string {
	return path.join(getManifestDir(), ROUTES_FILE);
}

/**
 * Build route mappings from collected file associations
 */
function buildRouteMappings(): Record<string, string[]> {
	const routes: Record<string, Set<string>> = {};

	for (const [hash, files] of hashToFiles) {
		for (const filePath of files) {
			const associatedRoutes = getAssociatedRoutes(filePath);
			for (const route of associatedRoutes) {
				if (!routes[route]) {
					routes[route] = new Set();
				}
				routes[route].add(hash);
			}
		}
	}

	// Convert Sets to sorted arrays for deterministic output
	const result: Record<string, string[]> = {};
	for (const [route, hashes] of Object.entries(routes)) {
		result[route] = Array.from(hashes).sort();
	}

	return result;
}

/**
 * Write manifest atomically (temp file + rename)
 * Also detects hash collisions and sorts output for deterministic diffs
 *
 * Writes two files:
 * - public/rosetta/manifest.json: Array of strings for sync to database
 * - public/rosetta/routes.json: Route to hash mapping for page-level loading
 */
function writeManifestAtomic(): void {
	try {
		const manifestDir = getManifestDir();
		const manifestPath = getManifestPath();
		const routesPath = getRoutesPath();
		const tempPath = `${manifestPath}.tmp`;
		const routesTempPath = `${routesPath}.tmp`;

		// Ensure directory exists (always create, don't check first)
		try {
			fs.mkdirSync(manifestDir, { recursive: true });
		} catch (e) {
			// Ignore EEXIST, throw others
			if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
				throw e;
			}
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

		// Read existing routes to merge
		let existingRoutes: Record<string, string[]> = {};
		if (fs.existsSync(routesPath)) {
			try {
				const content = fs.readFileSync(routesPath, 'utf-8');
				existingRoutes = JSON.parse(content);
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

		// Build route mappings
		const newRoutes = buildRouteMappings();

		// Merge routes (new routes override existing for same route)
		const mergedRoutes: Record<string, Set<string>> = {};
		for (const [route, hashes] of Object.entries(existingRoutes)) {
			mergedRoutes[route] = new Set(hashes);
		}
		for (const [route, hashes] of Object.entries(newRoutes)) {
			if (!mergedRoutes[route]) {
				mergedRoutes[route] = new Set();
			}
			for (const hash of hashes) {
				mergedRoutes[route].add(hash);
			}
		}

		// Convert to final format (sorted for determinism)
		const finalRoutes: Record<string, string[]> = {};
		const sortedRouteKeys = Object.keys(mergedRoutes).sort();
		for (const route of sortedRouteKeys) {
			finalRoutes[route] = Array.from(mergedRoutes[route]).sort();
		}

		// Write manifest.json (temp file + atomic rename, fallback to direct write)
		const manifestJson = JSON.stringify(data, null, 2);
		try {
			fs.writeFileSync(tempPath, manifestJson);
			fs.renameSync(tempPath, manifestPath);
		} catch {
			// Fallback: write directly if atomic rename fails
			fs.writeFileSync(manifestPath, manifestJson);
		}

		// Write routes.json (temp file + atomic rename, fallback to direct write)
		const routesJson = JSON.stringify(finalRoutes, null, 2);
		try {
			fs.writeFileSync(routesTempPath, routesJson);
			fs.renameSync(routesTempPath, routesPath);
		} catch {
			// Fallback: write directly if atomic rename fails
			fs.writeFileSync(routesPath, routesJson);
		}

		// Clear collected state after successful write
		collectedStrings.clear();
		hashToFiles.clear();
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
 * Webpack/Turbopack loader context type
 */
interface LoaderContext {
	resourcePath: string;
}

/**
 * Rosetta loader - extracts t() calls and writes to manifest
 *
 * Tracks source file for each string to enable page-level optimization.
 * The manifest includes route mappings for automatic per-page loading.
 */
export default function rosettaLoader(this: LoaderContext | void, source: string): string {
	// Get the file path from loader context (webpack/turbopack provide this)
	const resourcePath = (this as LoaderContext)?.resourcePath || '';

	const strings = extractStrings(source);

	// Add to collected strings and track file associations
	for (const item of strings) {
		collectedStrings.set(item.hash, item);

		// Track which files use this string
		if (resourcePath) {
			let files = hashToFiles.get(item.hash);
			if (!files) {
				files = new Set();
				hashToFiles.set(item.hash, files);
			}
			files.add(resourcePath);
		}
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
export { getManifestPath, getRoutesPath };

/**
 * Route manifest type for page-level loading
 */
export type { RouteManifest };

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
 * Read route mappings from routes.json
 * Returns mapping of route path to array of translation hashes
 */
export function readRoutes(): Record<string, string[]> {
	const routesPath = getRoutesPath();

	if (!fs.existsSync(routesPath)) {
		return {};
	}

	try {
		const content = fs.readFileSync(routesPath, 'utf-8');
		return JSON.parse(content);
	} catch {
		return {};
	}
}

/**
 * Get hashes for a specific route (with _shared fallback)
 * Includes _shared strings that are used across multiple routes
 */
export function getHashesForRoute(route: string): string[] {
	const routes = readRoutes();
	const routeHashes = routes[route] || [];
	const sharedHashes = routes['_shared'] || [];

	// Combine and deduplicate
	return [...new Set([...routeHashes, ...sharedHashes])];
}

/**
 * Clear the manifest (use with caution)
 */
export function clearManifest(): void {
	const manifestPath = getManifestPath();
	const routesPath = getRoutesPath();

	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath);
	}
	if (fs.existsSync(routesPath)) {
		fs.unlinkSync(routesPath);
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
	if (collectedStrings.size > 0 || hashToFiles.size > 0) {
		writeManifestAtomic();
	}
}

/**
 * Reset loader state (for testing)
 */
export function resetLoaderState(): void {
	collectedStrings.clear();
	hashToFiles.clear();
	if (writeTimer) {
		clearTimeout(writeTimer);
		writeTimer = null;
	}
}

// Export route detection for testing
export { filePathToRoute, getAssociatedRoutes };
