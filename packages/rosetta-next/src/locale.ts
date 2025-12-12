/**
 * Locale utilities for Next.js applications
 *
 * Server-side utilities to get available/ready locales based on translation coverage.
 *
 * @example
 * ```ts
 * // lib/i18n.ts - Define your locale config
 * import type { LocaleConfig } from '@sylphx/rosetta-next/server';
 *
 * export const LOCALE_CONFIG: LocaleConfig = {
 *   en: { name: 'English', nativeName: 'English' },
 *   'zh-TW': { name: 'Traditional Chinese', nativeName: '繁體中文', minCoverage: 80 },
 *   'zh-CN': { name: 'Simplified Chinese', nativeName: '简体中文', minCoverage: 80 },
 *   ja: { name: 'Japanese', nativeName: '日本語', minCoverage: 80 },
 * };
 * ```
 *
 * @example
 * ```ts
 * // app/api/locales/route.ts - API endpoint for language picker
 * import { getReadyLocales } from '@sylphx/rosetta-next/server';
 * import { rosetta, LOCALE_CONFIG } from '@/lib/i18n';
 *
 * export async function GET() {
 *   const locales = await getReadyLocales(rosetta, LOCALE_CONFIG);
 *   return Response.json(locales);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // components/LanguagePicker.tsx - Client component
 * 'use client';
 *
 * export function LanguagePicker() {
 *   const [locales, setLocales] = useState([]);
 *
 *   useEffect(() => {
 *     fetch('/api/locales').then(r => r.json()).then(setLocales);
 *   }, []);
 *
 *   return (
 *     <select onChange={e => setLocaleCookie(e.target.value)}>
 *       {locales.map(l => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
 *     </select>
 *   );
 * }
 * ```
 */

import type { Rosetta } from './server/rosetta';

// ============================================
// Types
// ============================================

/**
 * Configuration for a single locale
 */
export interface LocaleEntry {
	/** Display name in English (e.g., "Traditional Chinese") */
	name: string;
	/** Native name (e.g., "繁體中文") */
	nativeName: string;
	/**
	 * Minimum translation coverage percentage to be considered "ready"
	 * Default: 0 (always ready if enabled)
	 * Set to 80-100 for production-ready threshold
	 */
	minCoverage?: number;
	/**
	 * Whether this locale is enabled
	 * Default: true
	 */
	enabled?: boolean;
}

/**
 * Locale configuration map
 *
 * @example
 * ```ts
 * const config: LocaleConfig = {
 *   en: { name: 'English', nativeName: 'English' },
 *   'zh-TW': { name: 'Traditional Chinese', nativeName: '繁體中文', minCoverage: 80 },
 * };
 * ```
 */
export type LocaleConfig = Record<string, LocaleEntry>;

/**
 * Locale with translation stats
 */
export interface LocaleWithStats {
	/** Locale code (e.g., "zh-TW") */
	code: string;
	/** Display name in English */
	name: string;
	/** Native name */
	nativeName: string;
	/** Translation coverage percentage (0-100) */
	coverage: number;
	/** Total source strings */
	total: number;
	/** Translated strings for this locale */
	translated: number;
	/** Whether this locale meets the minCoverage threshold */
	ready: boolean;
}

/**
 * Options for getReadyLocales
 */
export interface GetReadyLocalesOptions {
	/**
	 * Only return locales that meet their minCoverage threshold
	 * Default: true
	 */
	onlyReady?: boolean;
	/**
	 * Include the default locale (usually 'en') in results
	 * Default: true
	 */
	includeDefault?: boolean;
}

// ============================================
// Server Utilities
// ============================================

/**
 * Get locales with translation coverage stats
 *
 * Combines rosetta translation stats with your locale config to return
 * a list of locales suitable for a language picker.
 *
 * @param rosetta - Rosetta instance
 * @param config - Your locale configuration
 * @param options - Filter options
 * @returns Array of locales with stats, sorted by code
 *
 * @example
 * ```ts
 * // Get all configured locales with stats
 * const allLocales = await getReadyLocales(rosetta, LOCALE_CONFIG, { onlyReady: false });
 *
 * // Get only production-ready locales (default)
 * const readyLocales = await getReadyLocales(rosetta, LOCALE_CONFIG);
 * ```
 */
export async function getReadyLocales(
	rosetta: Rosetta,
	config: LocaleConfig,
	options: GetReadyLocalesOptions = {}
): Promise<LocaleWithStats[]> {
	const { onlyReady = true, includeDefault = true } = options;

	const defaultLocale = rosetta.getDefaultLocale();

	// Get enabled locales from config
	const enabledLocales = Object.entries(config)
		.filter(([code, entry]) => {
			// Skip disabled locales
			if (entry.enabled === false) return false;
			// Optionally skip default locale
			if (!includeDefault && code === defaultLocale) return false;
			return true;
		})
		.map(([code]) => code);

	if (enabledLocales.length === 0) {
		return [];
	}

	// Get translation stats from rosetta
	const stats = await rosetta.getTranslationStats(enabledLocales);

	// Build result with coverage info
	const results: LocaleWithStats[] = [];

	for (const code of enabledLocales) {
		const entry = config[code];
		if (!entry) continue;

		const localeStats = stats.locales[code];
		const total = stats.totalStrings;
		const translated = localeStats?.translated ?? 0;
		const coverage = total > 0 ? Math.round((translated / total) * 100) : 0;

		// Default locale is always 100% (it's the source)
		const isDefault = code === defaultLocale;
		const actualCoverage = isDefault ? 100 : coverage;
		const actualTranslated = isDefault ? total : translated;

		const minCoverage = entry.minCoverage ?? 0;
		const ready = actualCoverage >= minCoverage;

		// Skip if not ready and onlyReady is true
		if (onlyReady && !ready) continue;

		results.push({
			code,
			name: entry.name,
			nativeName: entry.nativeName,
			coverage: actualCoverage,
			total,
			translated: actualTranslated,
			ready,
		});
	}

	// Sort by code for consistent ordering
	return results.sort((a, b) => a.code.localeCompare(b.code));
}

// ============================================
// Cookie Utilities
// ============================================

/** Default cookie name for locale preference */
export const LOCALE_COOKIE_NAME: string = 'NEXT_LOCALE';

/** Default cookie max age (1 year in seconds) */
export const LOCALE_COOKIE_MAX_AGE: number = 60 * 60 * 24 * 365;

/**
 * Options for locale cookie
 */
export interface LocaleCookieOptions {
	/** Cookie name (default: "NEXT_LOCALE") */
	name?: string;
	/** Max age in seconds (default: 1 year) */
	maxAge?: number;
	/** Cookie path (default: "/") */
	path?: string;
	/** SameSite attribute (default: "lax") */
	sameSite?: 'strict' | 'lax' | 'none';
	/** Secure flag (default: true in production) */
	secure?: boolean;
}

/**
 * Build a Set-Cookie header value for locale preference
 *
 * Use this in API routes or middleware to set the locale cookie.
 *
 * @param locale - Locale code to set
 * @param options - Cookie options
 * @returns Cookie string for Set-Cookie header
 *
 * @example
 * ```ts
 * // In API route
 * export async function POST(req: Request) {
 *   const { locale } = await req.json();
 *   return new Response(null, {
 *     status: 200,
 *     headers: { 'Set-Cookie': buildLocaleCookie(locale) },
 *   });
 * }
 * ```
 */
export function buildLocaleCookie(locale: string, options: LocaleCookieOptions = {}): string {
	const {
		name = LOCALE_COOKIE_NAME,
		maxAge = LOCALE_COOKIE_MAX_AGE,
		path = '/',
		sameSite = 'lax',
		secure = process.env.NODE_ENV === 'production',
	} = options;

	const parts = [
		`${name}=${encodeURIComponent(locale)}`,
		`Path=${path}`,
		`Max-Age=${maxAge}`,
		`SameSite=${sameSite}`,
	];

	if (secure) {
		parts.push('Secure');
	}

	return parts.join('; ');
}

/**
 * Parse locale from cookie header
 *
 * @param cookieHeader - Cookie header string from request
 * @param cookieName - Cookie name to look for (default: "NEXT_LOCALE")
 * @returns Locale code or undefined if not found
 *
 * @example
 * ```ts
 * // In middleware
 * const locale = parseLocaleCookie(request.headers.get('cookie'));
 * ```
 */
export function parseLocaleCookie(
	cookieHeader: string | null,
	cookieName: string = LOCALE_COOKIE_NAME
): string | undefined {
	if (!cookieHeader) return undefined;

	const cookies = cookieHeader.split(';').map((c) => c.trim());
	const localeCookie = cookies.find((c) => c.startsWith(`${cookieName}=`));

	if (!localeCookie) return undefined;

	const value = localeCookie.split('=')[1];
	return value ? decodeURIComponent(value) : undefined;
}
