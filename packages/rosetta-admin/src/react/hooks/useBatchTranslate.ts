'use client';

/**
 * Focused hook for batch translation
 */

import { useCallback, useMemo } from 'react';
import type { LocaleBatchProgress, SourceEntry } from '../../core/types';
import { useAdminState, useAdminStore } from '../context';

export interface UseBatchTranslateReturn {
	/** Is batch translation running for the active locale */
	isRunning: boolean;
	/** Progress for the active locale (null if not translating) */
	progress: LocaleBatchProgress | null;
	/** Per-locale batch progress (for multi-locale progress display) */
	allProgress: Record<string, LocaleBatchProgress | null>;
	/** Error message */
	error: string | null;

	/** Sources that need translation for current locale */
	untranslatedSources: SourceEntry[];
	/** Count of sources that need translation */
	untranslatedCount: number;

	/** Check if a specific locale is translating */
	isLocaleRunning: (locale: string) => boolean;
	/** Get progress for a specific locale */
	getLocaleProgress: (locale: string) => LocaleBatchProgress | null;

	/** Start batch translation */
	run: (options?: { locale?: string; hashes?: string[] }) => Promise<void>;
	/** Translate only selected sources */
	translateSelected: (hashes: string[]) => Promise<void>;
	/** Translate all untranslated sources */
	translateAll: () => Promise<void>;
}

/**
 * Hook for batch AI translation
 *
 * @example
 * ```tsx
 * function BatchTranslateButton() {
 *   const {
 *     isRunning,
 *     progress,
 *     untranslatedCount,
 *     translateAll,
 *   } = useBatchTranslate();
 *
 *   return (
 *     <button onClick={translateAll} disabled={isRunning || untranslatedCount === 0}>
 *       {isRunning && progress
 *         ? `Translating ${progress.current}/${progress.total}...`
 *         : `Translate ${untranslatedCount} strings`
 *       }
 *     </button>
 *   );
 * }
 * ```
 */
export function useBatchTranslate(): UseBatchTranslateReturn {
	const store = useAdminStore();

	const state = useAdminState((s) => s.getState());
	const untranslatedSources = useAdminState((s) => s.getUntranslatedSources());

	const run = useCallback(
		async (options?: { locale?: string; hashes?: string[] }) => {
			await store.batchTranslate(options?.locale, options?.hashes);
		},
		[store]
	);

	const translateSelected = useCallback(
		async (hashes: string[]) => {
			await store.batchTranslate(undefined, hashes);
		},
		[store]
	);

	const translateAll = useCallback(async () => {
		await store.batchTranslate();
	}, [store]);

	// Per-locale progress helpers
	const isLocaleRunning = useCallback(
		(locale: string) => state.batchProgress[locale] != null,
		[state.batchProgress]
	);

	const getLocaleProgress = useCallback(
		(locale: string) => state.batchProgress[locale] ?? null,
		[state.batchProgress]
	);

	// Compute isRunning for active locale
	const isRunning = state.activeLocale ? state.batchProgress[state.activeLocale] != null : false;
	const progress = state.activeLocale ? state.batchProgress[state.activeLocale] ?? null : null;

	return useMemo(
		() => ({
			isRunning,
			progress,
			allProgress: state.batchProgress,
			error: state.error,
			untranslatedSources,
			untranslatedCount: untranslatedSources.length,
			isLocaleRunning,
			getLocaleProgress,
			run,
			translateSelected,
			translateAll,
		}),
		[
			isRunning,
			progress,
			state.batchProgress,
			state.error,
			untranslatedSources,
			isLocaleRunning,
			getLocaleProgress,
			run,
			translateSelected,
			translateAll,
		]
	);
}
