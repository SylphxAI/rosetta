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

import fs from 'node:fs';
import path from 'node:path';
import type { StorageAdapter } from '@sylphx/rosetta';

// ============================================
// Configuration
// ============================================

const MANIFEST_DIR = process.env.ROSETTA_MANIFEST_DIR ?? '.rosetta';
const MANIFEST_FILE = 'manifest.json';
const LOCK_FILE = 'sync.lock';
const LOCK_TIMEOUT_MS = 30000; // 30 seconds max lock duration
const LOCK_RETRY_MS = 100; // Retry every 100ms
const LOCK_MAX_RETRIES = 50; // Max 5 seconds waiting for lock

// ============================================
// Path Helpers
// ============================================

function getManifestDir(): string {
	return path.join(process.cwd(), MANIFEST_DIR);
}

function getManifestPath(): string {
	return path.join(getManifestDir(), MANIFEST_FILE);
}

function getLockPath(): string {
	return path.join(getManifestDir(), LOCK_FILE);
}

// ============================================
// Manifest Schema Validation
// ============================================

interface ManifestEntry {
	text: string;
	hash: string;
}

interface ManifestValidationResult {
	valid: boolean;
	entries: ManifestEntry[];
	errors: string[];
	warnings: string[];
}

/**
 * Validate manifest entry structure
 */
function isValidEntry(entry: unknown): entry is ManifestEntry {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		typeof (entry as ManifestEntry).text === 'string' &&
		typeof (entry as ManifestEntry).hash === 'string' &&
		(entry as ManifestEntry).text.length > 0 &&
		(entry as ManifestEntry).hash.length > 0
	);
}

/**
 * Validate manifest structure and entries
 */
function validateManifest(parsed: unknown): ManifestValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const entries: ManifestEntry[] = [];

	if (!Array.isArray(parsed)) {
		errors.push('Manifest must be an array');
		return { valid: false, entries, errors, warnings };
	}

	const seenHashes = new Map<string, string>();

	for (let i = 0; i < parsed.length; i++) {
		const entry = parsed[i];

		if (!isValidEntry(entry)) {
			warnings.push(`Entry ${i}: Invalid structure, skipping`);
			continue;
		}

		// Check for duplicate hashes (collision detection)
		const existingText = seenHashes.get(entry.hash);
		if (existingText !== undefined) {
			if (existingText !== entry.text) {
				warnings.push(
					`Hash collision: "${entry.hash}" maps to both "${existingText}" and "${entry.text}"`
				);
			}
			// Skip duplicate
			continue;
		}

		seenHashes.set(entry.hash, entry.text);
		entries.push(entry);
	}

	return {
		valid: errors.length === 0,
		entries,
		errors,
		warnings,
	};
}

// ============================================
// Manifest Operations
// ============================================

function readManifest(): ManifestEntry[] {
	const manifestPath = getManifestPath();
	if (!fs.existsSync(manifestPath)) {
		return [];
	}
	try {
		const content = fs.readFileSync(manifestPath, 'utf-8');
		const parsed = JSON.parse(content);
		const validation = validateManifest(parsed);

		// Log warnings but continue
		if (validation.warnings.length > 0) {
			console.warn('[rosetta] Manifest warnings:');
			for (const warning of validation.warnings) {
				console.warn(`  - ${warning}`);
			}
		}

		// Log errors and return empty if invalid structure
		if (!validation.valid) {
			console.error('[rosetta] Manifest validation failed:');
			for (const error of validation.errors) {
				console.error(`  - ${error}`);
			}
			return [];
		}

		return validation.entries;
	} catch (error) {
		console.error('[rosetta] Failed to read manifest:', error);
		return [];
	}
}

/**
 * Clear manifest file
 * ONLY call this in development mode - production should preserve manifest
 */
function clearManifest(): void {
	const manifestPath = getManifestPath();
	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath);
	}
}

// ============================================
// Distributed Lock (File-based)
// ============================================

interface LockInfo {
	pid: number;
	hostname: string;
	timestamp: number;
}

/**
 * Acquire a file-based lock for sync operations
 * Prevents multiple processes/pods from syncing simultaneously
 */
async function acquireLock(): Promise<boolean> {
	const lockPath = getLockPath();
	const manifestDir = getManifestDir();

	// Ensure directory exists
	if (!fs.existsSync(manifestDir)) {
		fs.mkdirSync(manifestDir, { recursive: true });
	}

	const lockInfo: LockInfo = {
		pid: process.pid,
		hostname: require('node:os').hostname(),
		timestamp: Date.now(),
	};

	for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
		try {
			// Check if stale lock exists
			if (fs.existsSync(lockPath)) {
				try {
					const existingLock: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
					const lockAge = Date.now() - existingLock.timestamp;

					if (lockAge > LOCK_TIMEOUT_MS) {
						// Stale lock - remove it
						fs.unlinkSync(lockPath);
					} else {
						// Lock is held by another process
						await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
						continue;
					}
				} catch {
					// Corrupted lock file - remove it
					fs.unlinkSync(lockPath);
				}
			}

			// Try to create lock atomically (O_EXCL flag)
			const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
			fs.writeSync(fd, JSON.stringify(lockInfo));
			fs.closeSync(fd);
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
				// Another process created the lock - retry
				await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
				continue;
			}
			throw error;
		}
	}

	return false;
}

/**
 * Release the sync lock
 */
function releaseLock(): void {
	const lockPath = getLockPath();
	try {
		if (fs.existsSync(lockPath)) {
			fs.unlinkSync(lockPath);
		}
	} catch {
		// Ignore errors during lock release
	}
}

export interface RosettaPluginOptions {
	/** Verbose logging (default: true in development) */
	verbose?: boolean;
}

// Use permissive types for NextConfig to avoid conflicts with Next.js types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextConfig = Record<string, any>;

export interface SyncRosettaOptions {
	/** Enable verbose logging */
	verbose?: boolean;
	/**
	 * Clear manifest after sync
	 * @default false in production, true in development
	 */
	clearAfterSync?: boolean;
	/**
	 * Force sync even if lock cannot be acquired
	 * Use with caution - may cause duplicate syncs
	 * @default false
	 */
	forceLock?: boolean;
}

export interface SyncRosettaResult {
	/** Number of strings synced */
	synced: number;
	/** Whether lock was acquired */
	lockAcquired: boolean;
	/** Whether sync was skipped (e.g., lock not acquired) */
	skipped: boolean;
}

/**
 * Sync extracted strings from manifest to storage
 *
 * Run this AFTER build completes, not during build.
 * Typically in a postbuild script or during deployment.
 *
 * Features:
 * - Distributed lock prevents multiple processes from syncing simultaneously
 * - Production mode preserves manifest (safe for multi-pod deployments)
 * - Development mode clears manifest after sync
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
	options?: SyncRosettaOptions
): Promise<SyncRosettaResult> {
	const verbose = options?.verbose ?? false;
	const isProduction = process.env.NODE_ENV === 'production';
	// Default: clear in dev, preserve in prod
	const clearAfterSync = options?.clearAfterSync ?? !isProduction;
	const forceLock = options?.forceLock ?? false;

	// Try to acquire lock
	const lockAcquired = await acquireLock();

	if (!lockAcquired && !forceLock) {
		if (verbose) {
			console.log('[rosetta] Another process is syncing - skipping');
		}
		return { synced: 0, lockAcquired: false, skipped: true };
	}

	if (!lockAcquired && forceLock) {
		console.warn('[rosetta] ⚠️ Forcing sync without lock - may cause duplicates');
	}

	try {
		const strings = readManifest();

		if (strings.length === 0) {
			if (verbose) {
				console.log('[rosetta] No new strings to sync');
			}
			return { synced: 0, lockAcquired, skipped: false };
		}

		if (verbose) {
			console.log(`[rosetta] Syncing ${strings.length} strings to storage...`);
		}

		// Register to storage
		await storage.registerSources(strings);

		// Clear manifest after successful sync (only in dev by default)
		if (clearAfterSync) {
			clearManifest();
			if (verbose) {
				console.log('[rosetta] Cleared manifest after sync');
			}
		} else if (verbose) {
			console.log('[rosetta] Preserving manifest (production mode)');
		}

		if (verbose) {
			console.log(`[rosetta] ✓ Synced ${strings.length} strings`);
		}

		return { synced: strings.length, lockAcquired, skipped: false };
	} finally {
		// Always release lock
		if (lockAcquired) {
			releaseLock();
		}
	}
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
		webpack: (config: { module: { rules: unknown[] } }, context: unknown) => {
			config.module.rules.push({
				test: /\.(ts|tsx)$/,
				enforce: 'pre',
				use: [loaderPath],
			});

			if (nextConfig.webpack) {
				return nextConfig.webpack(config, context);
			}
			return config;
		},
	} as T;
}
