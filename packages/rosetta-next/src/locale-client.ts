'use client';

/**
 * Client-side locale utilities
 *
 * Utilities for changing locale from client components.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { setLocaleCookie } from '@sylphx/rosetta-next';
 *
 * function LanguagePicker({ locales }) {
 *   return (
 *     <select onChange={e => {
 *       setLocaleCookie(e.target.value);
 *       window.location.reload(); // or use router.refresh()
 *     }}>
 *       {locales.map(l => (
 *         <option key={l.code} value={l.code}>{l.nativeName}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */

// ============================================
// Constants (re-export from shared)
// ============================================

// Import for local use and re-export (single source of truth)
import { LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE } from './locale-constants';
export { LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE };

// ============================================
// Types
// ============================================

/**
 * Options for setLocaleCookie
 */
export interface SetLocaleCookieOptions {
	/** Cookie name (default: "NEXT_LOCALE") */
	name?: string;
	/** Max age in seconds (default: 1 year) */
	maxAge?: number;
	/** Cookie path (default: "/") */
	path?: string;
	/** SameSite attribute (default: "lax") */
	sameSite?: 'strict' | 'lax' | 'none';
	/** Secure flag (default: true if on HTTPS) */
	secure?: boolean;
	/**
	 * Action after setting cookie
	 * - 'reload': Full page reload (default)
	 * - 'none': Just set cookie, no navigation
	 * - URL string: Navigate to that URL
	 */
	action?: 'reload' | 'none' | string;
}

// ============================================
// Client Utilities
// ============================================

/**
 * Set locale preference cookie (client-side)
 *
 * Sets a cookie to remember the user's locale preference.
 * By default, reloads the page after setting the cookie.
 *
 * @param locale - Locale code to set (e.g., "zh-TW")
 * @param options - Cookie and action options
 *
 * @example
 * ```tsx
 * // Basic usage - sets cookie and reloads
 * <button onClick={() => setLocaleCookie('zh-TW')}>繁體中文</button>
 *
 * // Without reload (handle navigation yourself)
 * setLocaleCookie('zh-TW', { action: 'none' });
 * router.push(`/${locale}/current-page`);
 *
 * // Navigate to specific URL
 * setLocaleCookie('zh-TW', { action: '/zh-TW/dashboard' });
 * ```
 */
export function setLocaleCookie(locale: string, options: SetLocaleCookieOptions = {}): void {
	const {
		name = LOCALE_COOKIE_NAME,
		maxAge = LOCALE_COOKIE_MAX_AGE,
		path = '/',
		sameSite = 'lax',
		secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
		action = 'reload',
	} = options;

	// Build cookie string
	const parts = [
		`${name}=${encodeURIComponent(locale)}`,
		`path=${path}`,
		`max-age=${maxAge}`,
		`samesite=${sameSite}`,
	];

	if (secure) {
		parts.push('secure');
	}

	// Set the cookie
	document.cookie = parts.join('; ');

	// Handle action
	if (action === 'reload') {
		window.location.reload();
	} else if (action !== 'none') {
		// Navigate to URL
		window.location.href = action;
	}
}

/**
 * Get current locale from cookie (client-side)
 *
 * @param cookieName - Cookie name to look for (default: "NEXT_LOCALE")
 * @returns Locale code or undefined if not found
 *
 * @example
 * ```tsx
 * const savedLocale = getLocaleCookie();
 * if (savedLocale) {
 *   console.log('User prefers:', savedLocale);
 * }
 * ```
 */
export function getLocaleCookie(cookieName: string = LOCALE_COOKIE_NAME): string | undefined {
	if (typeof document === 'undefined') return undefined;

	const cookies = document.cookie.split(';').map((c: string) => c.trim());
	const localeCookie = cookies.find((c: string) => c.startsWith(`${cookieName}=`));

	if (!localeCookie) return undefined;

	const value = localeCookie.split('=')[1];
	return value ? decodeURIComponent(value) : undefined;
}

/**
 * Clear locale preference cookie (client-side)
 *
 * Removes the locale cookie, falling back to default detection.
 *
 * @param options - Cookie options (name, path)
 *
 * @example
 * ```tsx
 * <button onClick={() => clearLocaleCookie()}>Reset to default</button>
 * ```
 */
export function clearLocaleCookie(
	options: Pick<SetLocaleCookieOptions, 'name' | 'path'> = {}
): void {
	const { name = LOCALE_COOKIE_NAME, path = '/' } = options;

	// Set cookie with expired date to delete it
	document.cookie = `${name}=; path=${path}; max-age=0`;
}
