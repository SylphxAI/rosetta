/**
 * @sylphx/rosetta-next - Next.js integration for Rosetta i18n
 *
 * Client-side hooks for Next.js client components.
 *
 * @example
 * // For layout setup, use @sylphx/rosetta-next/server
 * import { RosettaProvider } from '@sylphx/rosetta-next/server';
 *
 * // For client components
 * import { useT, useLocale } from '@sylphx/rosetta-next';
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
