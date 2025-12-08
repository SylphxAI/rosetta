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
 *
 * @example
 * // Language picker with locale cookie
 * import { setLocaleCookie, getLocaleCookie } from '@sylphx/rosetta-next';
 *
 * function LanguagePicker({ locales }) {
 *   return (
 *     <select onChange={e => setLocaleCookie(e.target.value)}>
 *       {locales.map(l => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
 *     </select>
 *   );
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

// Re-export locale cookie utilities (client-side)
export {
	setLocaleCookie,
	getLocaleCookie,
	clearLocaleCookie,
	LOCALE_COOKIE_NAME,
	LOCALE_COOKIE_MAX_AGE,
	type SetLocaleCookieOptions,
} from './locale-client';

// Re-export locale data (for convenience, also available from /locales)
export {
	getAllLocales,
	getCommonLocales,
	getLocaleByCode,
	searchLocales,
	isValidLocale,
	ALL_LOCALES,
	COMMON_LOCALES,
	COMMON_LOCALE_CODES,
	type LocaleInfo,
} from './locales';
