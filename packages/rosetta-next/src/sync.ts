/**
 * Rosetta Next.js Plugin
 *
 * Adds loader to extract strings during build and write them to manifest.
 * The manifest is shipped with your app in public/rosetta/manifest.json.
 *
 * NO database sync needed - sources are served as static files!
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 *
 * export default withRosetta(nextConfig);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextConfig = Record<string, any>;

/**
 * Create a Next.js config with Rosetta loader integration
 *
 * Adds loaders to extract strings during build and write them to
 * public/rosetta/manifest.json which is shipped with your app.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 *
 * export default withRosetta(nextConfig);
 * ```
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
