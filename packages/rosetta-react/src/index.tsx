/**
 * @sylphx/rosetta-react - React bindings for Rosetta i18n
 *
 * Client-side hooks and provider for React applications.
 *
 * @example
 * // For server-side setup, use @sylphx/rosetta-react/server
 * import { RosettaProvider } from '@sylphx/rosetta-react/server';
 *
 * // For client components
 * import { useT, useLocale } from '@sylphx/rosetta-react';
 *
 * function MyClientComponent() {
 *   const t = useT();
 *   return <button>{t("Click me")}</button>;
 * }
 */

// Re-export all client-side exports
export {
	// Provider (for client-only apps)
	RosettaClientProvider,
	// Hooks
	useT,
	useLocale,
	useDefaultLocale,
	useTranslation,
	// Context (for advanced use)
	RosettaContext,
	// Types
	type TranslateFunction,
	type TranslateOptions,
	type TranslationContextValue,
	type RosettaClientProviderProps,
} from './client';
