/**
 * Rosetta Sync - Register extracted strings to storage
 *
 * Usage:
 * ```ts
 * import { syncRosetta } from '@sylphx/rosetta-next/sync';
 * import { storage } from './src/lib/rosetta';
 *
 * await syncRosetta({ storage });
 * ```
 */

import type { StorageAdapter } from '@sylphx/rosetta';
import { readManifest, clearManifest, getManifestPath } from './loader';
import fs from 'node:fs';

export interface SyncOptions {
	/** Storage adapter to sync to */
	storage: StorageAdapter;
	/** Clear manifest after sync (default: true) */
	clearAfterSync?: boolean;
	/** Custom manifest path (default: .rosetta/manifest.json) */
	manifestPath?: string;
	/** Verbose logging */
	verbose?: boolean;
}

/**
 * Sync extracted strings from manifest to storage
 */
export async function syncRosetta(options: SyncOptions): Promise<{ synced: number }> {
	const { storage, clearAfterSync = true, manifestPath, verbose = false } = options;

	// Read manifest
	let strings: Array<{ text: string; hash: string }>;

	if (manifestPath) {
		if (!fs.existsSync(manifestPath)) {
			if (verbose) {
				console.log('[rosetta] No manifest found at:', manifestPath);
			}
			return { synced: 0 };
		}
		strings = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	} else {
		strings = readManifest();
	}

	if (strings.length === 0) {
		if (verbose) {
			console.log('[rosetta] No strings to sync');
		}
		return { synced: 0 };
	}

	if (verbose) {
		console.log(`[rosetta] Syncing ${strings.length} strings to storage...`);
	}

	// Register to storage
	await storage.registerSources(strings);

	if (verbose) {
		console.log(`[rosetta] Synced ${strings.length} strings`);
	}

	// Clear manifest after successful sync
	if (clearAfterSync && !manifestPath) {
		clearManifest();
	}

	return { synced: strings.length };
}

/**
 * Create a Next.js config wrapper that syncs after build
 *
 * Usage:
 * ```ts
 * import { withRosetta } from '@sylphx/rosetta-next/sync';
 * import { storage } from './src/lib/rosetta';
 *
 * export default withRosetta(nextConfig, { storage });
 * ```
 */
export function withRosetta<T extends Record<string, unknown>>(
	nextConfig: T,
	options: Omit<SyncOptions, 'clearAfterSync'>
): T {
	const originalGenerateBuildId =
		(nextConfig as { generateBuildId?: () => Promise<string> }).generateBuildId;

	return {
		...nextConfig,
		generateBuildId: async () => {
			// Sync after build ID is generated (which happens during build)
			// Note: This runs at build start, not end. For true postbuild sync,
			// use the CLI or a postbuild script.
			await syncRosetta({ ...options, verbose: true });

			if (originalGenerateBuildId) {
				return originalGenerateBuildId();
			}

			return `${Date.now()}`;
		},
	};
}
