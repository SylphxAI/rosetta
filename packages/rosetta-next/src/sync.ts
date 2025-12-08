/**
 * Rosetta Sync & Next.js Plugin
 *
 * Usage:
 * ```ts
 * // next.config.ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 *
 * export default withRosetta(nextConfig);
 * ```
 *
 * Then sync strings to DB after build:
 * ```ts
 * // scripts/sync-rosetta.ts
 * import { syncRosetta } from '@sylphx/rosetta-next/sync';
 * import { storage } from './src/lib/rosetta';
 *
 * await syncRosetta(storage);
 * ```
 */

import type { StorageAdapter } from '@sylphx/rosetta';
import fs from 'node:fs';
import path from 'node:path';

// Inline manifest functions to avoid bunup duplicate export bug
const MANIFEST_DIR = '.rosetta';
const MANIFEST_FILE = 'manifest.json';

function getManifestPath(): string {
	return path.join(process.cwd(), MANIFEST_DIR, MANIFEST_FILE);
}

function readManifest(): Array<{ text: string; hash: string }> {
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

function clearManifest(): void {
	const manifestPath = getManifestPath();
	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath);
	}
}

export interface RosettaPluginOptions {
	/** Verbose logging (default: true in development) */
	verbose?: boolean;
}

// Use permissive types for NextConfig to avoid conflicts with Next.js types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextConfig = Record<string, any>;

/**
 * Sync extracted strings from manifest to storage
 *
 * Run this AFTER build completes, not during build.
 * Typically in a postbuild script or during deployment.
 *
 * @example
 * ```ts
 * // scripts/sync-rosetta.ts
 * import { syncRosetta } from '@sylphx/rosetta-next/sync';
 * import { storage } from '../src/lib/rosetta-storage';
 *
 * await syncRosetta(storage, { verbose: true });
 * ```
 */
export async function syncRosetta(
	storage: StorageAdapter,
	options?: { verbose?: boolean; clearAfterSync?: boolean }
): Promise<{ synced: number }> {
	const verbose = options?.verbose ?? false;
	const clearAfterSync = options?.clearAfterSync ?? true;
	const strings = readManifest();

	if (strings.length === 0) {
		if (verbose) {
			console.log('[rosetta] No new strings to sync');
		}
		return { synced: 0 };
	}

	if (verbose) {
		console.log(`[rosetta] Syncing ${strings.length} strings to storage...`);
	}

	// Register to storage
	await storage.registerSources(strings);

	// Clear manifest after successful sync
	if (clearAfterSync) {
		clearManifest();
	}

	if (verbose) {
		console.log(`[rosetta] ✓ Synced ${strings.length} strings`);
	}

	return { synced: strings.length };
}

/**
 * Create a Next.js config with Rosetta loader integration
 *
 * This ONLY adds the Turbopack/Webpack loader for string extraction.
 * Strings are written to .rosetta/manifest.json during build.
 *
 * To sync strings to your database, run syncRosetta() in a postbuild script.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 *
 * export default withRosetta({
 *   // your next config
 * });
 * ```
 */
export function withRosetta<T extends NextConfig>(nextConfig: T, options?: RosettaPluginOptions): T {
	const verbose = options?.verbose ?? process.env.NODE_ENV !== 'production';

	// Get loader path - use require.resolve at runtime
	// Use computed string to prevent bundler from resolving at build time
	const loaderPackage = '@sylphx/rosetta-next' + '/loader';
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const loaderPath = require.resolve(loaderPackage);

	if (verbose) {
		console.log('[rosetta] Adding loader for string extraction');
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
		webpack: (config: { module: { rules: unknown[] } }, context: unknown) => {
			config.module.rules.push({
				test: /\.(ts|tsx)$/,
				use: [loaderPath],
			});

			if (nextConfig.webpack) {
				return nextConfig.webpack(config, context);
			}
			return config;
		},
	} as T;
}
