/**
 * @deprecated Use CLI extraction instead of webpack loader.
 *
 * The webpack/turbopack loader approach is deprecated in favor of
 * CLI-based extraction which works better with Edge runtime.
 *
 * Migration:
 * 1. Remove withRosetta from next.config.ts
 * 2. Add to package.json scripts:
 *    "build": "rosetta extract -o src/rosetta/manifest.ts && next build"
 * 3. Import manifest directly in your admin handlers
 *
 * @example
 * ```ts
 * // Before (deprecated):
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 * export default withRosetta(nextConfig);
 *
 * // After:
 * // 1. package.json: "build": "rosetta extract -o src/rosetta/manifest.ts && next build"
 * // 2. In admin handler:
 * import { manifest } from '@/rosetta/manifest';
 * ```
 */

import path from 'node:path';

// ============================================
// Configuration
// ============================================

const DEFAULT_MANIFEST_DIR = 'public/rosetta';
const MANIFEST_FILE = 'manifest.json';

// ============================================
// Path Helpers
// ============================================

function getManifestDir(): string {
	// Read env at runtime (not module load time) for testability
	const dir = process.env.ROSETTA_MANIFEST_DIR ?? DEFAULT_MANIFEST_DIR;
	return path.join(process.cwd(), dir);
}

function getManifestPath(): string {
	return path.join(getManifestDir(), MANIFEST_FILE);
}

// ============================================
// Next.js Plugin
// ============================================

export interface RosettaPluginOptions {
	/** Verbose logging (default: true in development) */
	verbose?: boolean;
}

// Use permissive types for NextConfig to avoid conflicts with Next.js types
type NextConfig = Record<string, unknown>;

/**
 * @deprecated Use CLI extraction instead. See module docs for migration guide.
 */
export function withRosetta<T extends NextConfig>(
	nextConfig: T,
	options?: RosettaPluginOptions
): T {
	const verbose = options?.verbose ?? process.env.NODE_ENV !== 'production';

	// Get loader path - use require.resolve at runtime
	// Use computed string to prevent bundler from resolving at build time
	const loaderPackage = '@sylphx/rosetta-next' + '/loader';
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const loaderPath = require.resolve(loaderPackage);

	if (verbose) {
		console.log('[rosetta] Adding loader for string extraction');
		console.log(`[rosetta] Manifest will be written to ${getManifestPath()}`);
	}

	return {
		...nextConfig,
		// Add Turbopack rules for loader
		turbopack: {
			...nextConfig.turbopack,
			rules: {
				...nextConfig.turbopack?.rules,
				'*.tsx': {
					loaders: [loaderPath],
				},
				'*.ts': {
					loaders: [loaderPath],
				},
			},
		},
		// Add webpack loader (for webpack builds)
		// enforce: 'pre' ensures our loader runs before other loaders (e.g., babel, swc)
		webpack: (
			config: { module: { rules: unknown[] } },
			_context: { isServer: boolean; dev: boolean }
		) => {
			// Add loader for string extraction
			config.module.rules.push({
				test: /\.(ts|tsx)$/,
				enforce: 'pre',
				use: [loaderPath],
			});

			if (nextConfig.webpack) {
				return nextConfig.webpack(config, _context);
			}
			return config;
		},
	} as T;
}
