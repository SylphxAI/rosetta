'use client';

/**
 * Main hook for translation admin
 * Provides all state and actions needed to build a translation admin UI
 */

import { useCallback, useMemo } from 'react';
import type {
	LocaleBatchProgress,
	SourceEntry,
	StatusFilter,
	TranslationStatsData,
	ViewState,
} from '../../core/types';
import { useAdminState, useAdminStore } from '../context';

export interface UseTranslationAdminReturn {
	// ==================== Data ====================
	/** All source strings with translations */
	sources: SourceEntry[];
	/** Active locales */
	locales: string[];
	/** Translation statistics */
	stats: TranslationStatsData;

	// ==================== View State ====================
	/** Current view */
	view: ViewState;
	/** Currently active locale (in editor view) */
	activeLocale: string | null;
	/** Filtered sources based on search/filter */
	filteredSources: SourceEntry[];

	// ==================== Editor State ====================
	/** Current search query */
	searchQuery: string;
	/** Current status filter */
	statusFilter: StatusFilter;
	/** Currently editing hash */
	editingHash: string | null;

	// ==================== Loading States ====================
	/** Is fetching data */
	isLoading: boolean;
	/** Is any locale batch translating (for backward compatibility) */
	isBatchTranslating: boolean;
	/** Per-locale batch translation progress */
	batchProgress: Record<string, LocaleBatchProgress | null>;
	/** Check if a specific locale is translating */
	isLocaleTranslating: (locale: string) => boolean;
	/** Get batch progress for a specific locale */
	getLocaleBatchProgress: (locale: string) => LocaleBatchProgress | null;
	/** Error message */
	error: string | null;

	// ==================== Navigation Actions ====================
	/** Enter editor view for a locale */
	enterEditor: (locale: string) => void;
	/** Exit editor view */
	exitEditor: () => void;

	// ==================== Editor Actions ====================
	/** Set search query */
	setSearchQuery: (query: string) => void;
	/** Set status filter */
	setStatusFilter: (filter: StatusFilter) => void;
	/** Set currently editing hash */
	setEditingHash: (hash: string | null) => void;

	// ==================== Mutation Actions ====================
	/** Save a translation */
	saveTranslation: (sourceHash: string, translatedText: string, locale?: string) => Promise<void>;
	/** Mark as reviewed */
	markAsReviewed: (sourceHash: string, locale?: string) => Promise<void>;
	/** Batch translate */
	batchTranslate: (locale?: string, hashes?: string[]) => Promise<void>;
	/** Add a new locale */
	addLocale: (locale: string) => Promise<void>;
	/** Remove a locale */
	removeLocale: (locale: string) => Promise<void>;
	/** Refresh data */
	refresh: () => Promise<void>;

	// ==================== Helper Functions ====================
	/** Get progress percentage for a locale */
	getLocaleProgress: (locale: string) => number;
	/** Get count of outdated translations for a locale */
	getOutdatedCount: (locale: string) => number;
	/** Get untranslated sources for current locale */
	getUntranslatedSources: () => SourceEntry[];
}

/**
 * Main hook for translation admin UI
 *
 * @example
 * ```tsx
 * function TranslationDashboard() {
 *   const {
 *     locales,
 *     stats,
 *     enterEditor,
 *     getLocaleProgress,
 *   } = useTranslationAdmin();
 *
 *   return (
 *     <div>
 *       {locales.map(locale => (
 *         <div key={locale} onClick={() => enterEditor(locale)}>
 *           {locale}: {getLocaleProgress(locale)}%
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslationAdmin(): UseTranslationAdminReturn {
	const store = useAdminStore();

	// Subscribe to state
	const state = useAdminState((s) => s.getState());
	const filteredSources = useAdminState((s) => s.getFilteredSources());

	// Memoize action callbacks
	const enterEditor = useCallback((locale: string) => store.enterEditor(locale), [store]);
	const exitEditor = useCallback(() => store.exitEditor(), [store]);
	const setSearchQuery = useCallback((query: string) => store.setSearchQuery(query), [store]);
	const setStatusFilter = useCallback(
		(filter: StatusFilter) => store.setStatusFilter(filter),
		[store]
	);
	const setEditingHash = useCallback((hash: string | null) => store.setEditingHash(hash), [store]);
	const saveTranslation = useCallback(
		(sourceHash: string, translatedText: string, locale?: string) =>
			store.saveTranslation(sourceHash, translatedText, locale),
		[store]
	);
	const markAsReviewed = useCallback(
		(sourceHash: string, locale?: string) => store.markAsReviewed(sourceHash, locale),
		[store]
	);
	const batchTranslate = useCallback(
		(locale?: string, hashes?: string[]) => store.batchTranslate(locale, hashes),
		[store]
	);
	const addLocale = useCallback((locale: string) => store.addLocale(locale), [store]);
	const removeLocale = useCallback((locale: string) => store.removeLocale(locale), [store]);
	const refresh = useCallback(() => store.fetchData(), [store]);
	const getLocaleProgress = useCallback(
		(locale: string) => store.getLocaleProgress(locale),
		[store]
	);
	const getOutdatedCount = useCallback((locale: string) => store.getOutdatedCount(locale), [store]);
	const getUntranslatedSources = useCallback(() => store.getUntranslatedSources(), [store]);

	// Per-locale batch progress helpers
	const isLocaleTranslating = useCallback(
		(locale: string) => state.batchProgress[locale] != null,
		[state.batchProgress]
	);
	const getLocaleBatchProgress = useCallback(
		(locale: string) => state.batchProgress[locale] ?? null,
		[state.batchProgress]
	);

	// Compute if any locale is translating (for backward compatibility)
	const isBatchTranslating = Object.keys(state.batchProgress).length > 0;

	return useMemo(
		() => ({
			// Data
			sources: state.sources,
			locales: state.locales,
			stats: state.stats,

			// View state
			view: state.view,
			activeLocale: state.activeLocale,
			filteredSources,

			// Editor state
			searchQuery: state.searchQuery,
			statusFilter: state.statusFilter,
			editingHash: state.editingHash,

			// Loading
			isLoading: state.isLoading,
			isBatchTranslating,
			batchProgress: state.batchProgress,
			isLocaleTranslating,
			getLocaleBatchProgress,
			error: state.error,

			// Actions
			enterEditor,
			exitEditor,
			setSearchQuery,
			setStatusFilter,
			setEditingHash,
			saveTranslation,
			markAsReviewed,
			batchTranslate,
			addLocale,
			removeLocale,
			refresh,

			// Helpers
			getLocaleProgress,
			getOutdatedCount,
			getUntranslatedSources,
		}),
		[
			state,
			filteredSources,
			isBatchTranslating,
			isLocaleTranslating,
			getLocaleBatchProgress,
			enterEditor,
			exitEditor,
			setSearchQuery,
			setStatusFilter,
			setEditingHash,
			saveTranslation,
			markAsReviewed,
			batchTranslate,
			addLocale,
			removeLocale,
			refresh,
			getLocaleProgress,
			getOutdatedCount,
			getUntranslatedSources,
		]
	);
}
