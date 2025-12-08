/**
 * React module - hooks and context for translation admin
 */

// Context
export { TranslationAdminProvider, type TranslationAdminProviderProps } from './context';

// Hooks
export { useTranslationAdmin, type UseTranslationAdminReturn } from './hooks/useTranslationAdmin';
export { useTranslationEditor, type UseTranslationEditorReturn, type UseTranslationEditorOptions } from './hooks/useTranslationEditor';
export { useBatchTranslate, type UseBatchTranslateReturn } from './hooks/useBatchTranslate';

// Clients
export { createTRPCClient, type TRPCAdminRouter } from './clients/trpc';
export { createRestClient, type RestClientOptions } from './clients/rest';

// Re-export core types for convenience
export type {
  SourceEntry,
  TranslationData,
  LocaleStats,
  TranslationStatsData,
  StatusFilter,
  ViewState,
  AdminState,
} from '../core/types';
