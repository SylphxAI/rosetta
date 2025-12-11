'use client';

/**
 * Focused hook for translation editor view
 * Provides only the state and actions needed for editing translations
 */

import { useCallback, useMemo, useState } from 'react';
import type { SourceEntry, StatusFilter, TranslationData } from '../../core/types';
import { getTranslationStatus } from '../../core/types';
import { useAdminState, useAdminStore } from '../context';

export interface UseTranslationEditorOptions {
	/** Locale to edit (defaults to activeLocale from store) */
	locale?: string;
}

export interface UseTranslationEditorReturn {
	/** Active locale */
	locale: string | null;
	/** Filtered sources */
	sources: SourceEntry[];
	/** Current search query */
	searchQuery: string;
	/** Current status filter */
	statusFilter: StatusFilter;
	/** Currently editing hash */
	editingHash: string | null;
	/** Is saving */
	isSaving: boolean;
	/** Save error */
	saveError: string | null;

	/** Set search query */
	setSearchQuery: (query: string) => void;
	/** Set status filter */
	setStatusFilter: (filter: StatusFilter) => void;

	/** Start editing a source */
	startEditing: (hash: string) => void;
	/** Cancel editing */
	cancelEditing: () => void;
	/** Save translation */
	saveTranslation: (hash: string, text: string) => Promise<void>;
	/** Mark as reviewed */
	markAsReviewed: (hash: string) => Promise<void>;

	/** Get translation data for a source */
	getTranslation: (source: SourceEntry) => TranslationData | null;
	/** Get status for a source */
	getStatus: (source: SourceEntry) => ReturnType<typeof getTranslationStatus>;
}

/**
 * Hook for translation editor functionality
 *
 * @example
 * ```tsx
 * function TranslationEditor() {
 *   const {
 *     sources,
 *     searchQuery,
 *     setSearchQuery,
 *     startEditing,
 *     saveTranslation,
 *   } = useTranslationEditor();
 *
 *   return (
 *     <div>
 *       <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
 *       {sources.map(source => (
 *         <div key={source.sourceHash} onClick={() => startEditing(source.sourceHash)}>
 *           {source.effectiveSource}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslationEditor(
	options: UseTranslationEditorOptions = {}
): UseTranslationEditorReturn {
	const store = useAdminStore();
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const state = useAdminState((s) => s.getState());
	const filteredSources = useAdminState((s) => s.getFilteredSources());

	const locale = options.locale ?? state.activeLocale;

	// Actions
	const setSearchQuery = useCallback((query: string) => store.setSearchQuery(query), [store]);
	const setStatusFilter = useCallback(
		(filter: StatusFilter) => store.setStatusFilter(filter),
		[store]
	);
	const startEditing = useCallback((hash: string) => store.setEditingHash(hash), [store]);
	const cancelEditing = useCallback(() => store.setEditingHash(null), [store]);

	const saveTranslation = useCallback(
		async (hash: string, text: string) => {
			if (!locale) return;
			setIsSaving(true);
			setSaveError(null);
			try {
				await store.saveTranslation(hash, text, locale);
				store.setEditingHash(null);
			} catch (err) {
				setSaveError(err instanceof Error ? err.message : 'Failed to save');
				throw err;
			} finally {
				setIsSaving(false);
			}
		},
		[store, locale]
	);

	const markAsReviewed = useCallback(
		async (hash: string) => {
			if (!locale) return;
			await store.markAsReviewed(hash, locale);
		},
		[store, locale]
	);

	// Helpers
	const getTranslation = useCallback(
		(source: SourceEntry): TranslationData | null => {
			if (!locale) return null;
			return source.translations[locale] ?? null;
		},
		[locale]
	);

	const getStatus = useCallback(
		(source: SourceEntry) => {
			const translation = getTranslation(source);
			return getTranslationStatus(translation, translation?.outdated ?? false);
		},
		[getTranslation]
	);

	return useMemo(
		() => ({
			locale,
			sources: filteredSources,
			searchQuery: state.searchQuery,
			statusFilter: state.statusFilter,
			editingHash: state.editingHash,
			isSaving,
			saveError,
			setSearchQuery,
			setStatusFilter,
			startEditing,
			cancelEditing,
			saveTranslation,
			markAsReviewed,
			getTranslation,
			getStatus,
		}),
		[
			locale,
			filteredSources,
			state.searchQuery,
			state.statusFilter,
			state.editingHash,
			isSaving,
			saveError,
			setSearchQuery,
			setStatusFilter,
			startEditing,
			cancelEditing,
			saveTranslation,
			markAsReviewed,
			getTranslation,
			getStatus,
		]
	);
}
