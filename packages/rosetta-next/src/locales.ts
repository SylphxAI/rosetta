/**
 * World Languages Data
 *
 * Comprehensive list of world languages for admin UIs and language pickers.
 * Based on ISO 639-1 codes with common regional variants.
 *
 * @example
 * ```tsx
 * // Admin UI: Add new language dropdown
 * import { getAllLocales } from '@sylphx/rosetta-next/locales';
 *
 * function AddLanguageDropdown() {
 *   return (
 *     <select>
 *       <option>Select language...</option>
 *       {getAllLocales().map(l => (
 *         <option key={l.code} value={l.code}>
 *           {l.name} ({l.nativeName})
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Use common locales for simpler UI
 * import { COMMON_LOCALES } from '@sylphx/rosetta-next/locales';
 *
 * // Top 30 languages by internet usage
 * console.log(COMMON_LOCALES);
 * ```
 */

// ============================================
// Types
// ============================================

/**
 * Information about a locale/language
 */
export interface LocaleInfo {
	/** ISO locale code (e.g., 'en', 'zh-TW', 'pt-BR') */
	code: string;
	/** English name (e.g., 'Chinese (Traditional)') */
	name: string;
	/** Native name (e.g., '繁體中文') */
	nativeName: string;
	/** Region name if applicable (e.g., 'Taiwan') */
	region?: string;
}

// ============================================
// Complete Language List
// ============================================

/**
 * Complete list of world languages
 *
 * Includes:
 * - All major ISO 639-1 languages
 * - Common regional variants (zh-CN, zh-TW, pt-BR, etc.)
 * - Sorted alphabetically by English name
 */
export const ALL_LOCALES: readonly LocaleInfo[] = [
	{ code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
	{ code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
	{ code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
	{ code: 'ar', name: 'Arabic', nativeName: 'العربية' },
	{ code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية (مصر)', region: 'Egypt' },
	{
		code: 'ar-SA',
		name: 'Arabic (Saudi Arabia)',
		nativeName: 'العربية (السعودية)',
		region: 'Saudi Arabia',
	},
	{ code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
	{ code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
	{ code: 'eu', name: 'Basque', nativeName: 'Euskara' },
	{ code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
	{ code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
	{ code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
	{ code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
	{ code: 'my', name: 'Burmese', nativeName: 'မြန်မာ' },
	{ code: 'ca', name: 'Catalan', nativeName: 'Català' },
	{ code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
	{ code: 'zh', name: 'Chinese', nativeName: '中文' },
	{ code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', region: 'China' },
	{ code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', region: 'Taiwan' },
	{
		code: 'zh-HK',
		name: 'Chinese (Hong Kong)',
		nativeName: '繁體中文 (香港)',
		region: 'Hong Kong',
	},
	{ code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
	{ code: 'cs', name: 'Czech', nativeName: 'Čeština' },
	{ code: 'da', name: 'Danish', nativeName: 'Dansk' },
	{ code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
	{ code: 'nl-BE', name: 'Dutch (Belgium)', nativeName: 'Nederlands (België)', region: 'Belgium' },
	{ code: 'en', name: 'English', nativeName: 'English' },
	{
		code: 'en-AU',
		name: 'English (Australia)',
		nativeName: 'English (Australia)',
		region: 'Australia',
	},
	{ code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', region: 'Canada' },
	{ code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', region: 'United Kingdom' },
	{ code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', region: 'India' },
	{ code: 'en-US', name: 'English (US)', nativeName: 'English (US)', region: 'United States' },
	{ code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
	{ code: 'et', name: 'Estonian', nativeName: 'Eesti' },
	{ code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
	{ code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
	{ code: 'fr', name: 'French', nativeName: 'Français' },
	{ code: 'fr-BE', name: 'French (Belgium)', nativeName: 'Français (Belgique)', region: 'Belgium' },
	{ code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', region: 'Canada' },
	{
		code: 'fr-CH',
		name: 'French (Switzerland)',
		nativeName: 'Français (Suisse)',
		region: 'Switzerland',
	},
	{ code: 'gl', name: 'Galician', nativeName: 'Galego' },
	{ code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
	{ code: 'de', name: 'German', nativeName: 'Deutsch' },
	{
		code: 'de-AT',
		name: 'German (Austria)',
		nativeName: 'Deutsch (Österreich)',
		region: 'Austria',
	},
	{
		code: 'de-CH',
		name: 'German (Switzerland)',
		nativeName: 'Deutsch (Schweiz)',
		region: 'Switzerland',
	},
	{ code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
	{ code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
	{ code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
	{ code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
	{ code: 'he', name: 'Hebrew', nativeName: 'עברית' },
	{ code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
	{ code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
	{ code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
	{ code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
	{ code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
	{ code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
	{ code: 'it', name: 'Italian', nativeName: 'Italiano' },
	{
		code: 'it-CH',
		name: 'Italian (Switzerland)',
		nativeName: 'Italiano (Svizzera)',
		region: 'Switzerland',
	},
	{ code: 'ja', name: 'Japanese', nativeName: '日本語' },
	{ code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa' },
	{ code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
	{ code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
	{ code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
	{ code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda' },
	{ code: 'ko', name: 'Korean', nativeName: '한국어' },
	{ code: 'ku', name: 'Kurdish', nativeName: 'Kurdî' },
	{ code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
	{ code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
	{ code: 'la', name: 'Latin', nativeName: 'Latina' },
	{ code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
	{ code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
	{ code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
	{ code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
	{ code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
	{ code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
	{ code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
	{ code: 'mt', name: 'Maltese', nativeName: 'Malti' },
	{ code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori' },
	{ code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
	{ code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
	{ code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
	{ code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
	{ code: 'nb', name: 'Norwegian Bokmål', nativeName: 'Norsk Bokmål' },
	{ code: 'nn', name: 'Norwegian Nynorsk', nativeName: 'Norsk Nynorsk' },
	{ code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
	{ code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
	{ code: 'fa', name: 'Persian', nativeName: 'فارسی' },
	{ code: 'pl', name: 'Polish', nativeName: 'Polski' },
	{ code: 'pt', name: 'Portuguese', nativeName: 'Português' },
	{
		code: 'pt-BR',
		name: 'Portuguese (Brazil)',
		nativeName: 'Português (Brasil)',
		region: 'Brazil',
	},
	{
		code: 'pt-PT',
		name: 'Portuguese (Portugal)',
		nativeName: 'Português (Portugal)',
		region: 'Portugal',
	},
	{ code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
	{ code: 'ro', name: 'Romanian', nativeName: 'Română' },
	{ code: 'ru', name: 'Russian', nativeName: 'Русский' },
	{ code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa' },
	{ code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig' },
	{ code: 'sr', name: 'Serbian', nativeName: 'Српски' },
	{ code: 'sr-Latn', name: 'Serbian (Latin)', nativeName: 'Srpski (latinica)' },
	{ code: 'sn', name: 'Shona', nativeName: 'Shona' },
	{ code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
	{ code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
	{ code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
	{ code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
	{ code: 'so', name: 'Somali', nativeName: 'Soomaali' },
	{ code: 'es', name: 'Spanish', nativeName: 'Español' },
	{
		code: 'es-AR',
		name: 'Spanish (Argentina)',
		nativeName: 'Español (Argentina)',
		region: 'Argentina',
	},
	{ code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', region: 'Mexico' },
	{ code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', region: 'Spain' },
	{ code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
	{ code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
	{ code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
	{ code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
	{ code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
	{ code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
	{ code: 'tt', name: 'Tatar', nativeName: 'Татар' },
	{ code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
	{ code: 'th', name: 'Thai', nativeName: 'ไทย' },
	{ code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
	{ code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
	{ code: 'tk', name: 'Turkmen', nativeName: 'Türkmen' },
	{ code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
	{ code: 'ur', name: 'Urdu', nativeName: 'اردو' },
	{ code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە' },
	{ code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek' },
	{ code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
	{ code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
	{ code: 'xh', name: 'Xhosa', nativeName: 'IsiXhosa' },
	{ code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש' },
	{ code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
	{ code: 'zu', name: 'Zulu', nativeName: 'IsiZulu' },
] as const;

// ============================================
// Common Locales (Top 30 by internet usage)
// ============================================

/**
 * Common locales - Top languages by internet usage
 *
 * Use this for simpler UIs or as a quick-start list.
 * Includes the most commonly needed languages for web applications.
 */
export const COMMON_LOCALE_CODES: readonly string[] = [
	'en',
	'zh-CN',
	'zh-TW',
	'es',
	'ar',
	'pt-BR',
	'pt',
	'ja',
	'ko',
	'de',
	'fr',
	'it',
	'ru',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'id',
	'ms',
	'hi',
	'bn',
	'uk',
	'cs',
	'el',
	'he',
	'ro',
	'hu',
	'sv',
	'da',
] as const;

/**
 * Common locales with full info
 */
export const COMMON_LOCALES: readonly LocaleInfo[] = COMMON_LOCALE_CODES.map(
	(code) => ALL_LOCALES.find((l) => l.code === code)!
).filter(Boolean);

// ============================================
// Helper Functions
// ============================================

/**
 * Get all available locales
 *
 * @returns Array of all locale info, sorted by English name
 *
 * @example
 * ```tsx
 * const locales = getAllLocales();
 * // Use in dropdown
 * ```
 */
export function getAllLocales(): readonly LocaleInfo[] {
	return ALL_LOCALES;
}

/**
 * Get common locales (top 30 by internet usage)
 *
 * @returns Array of common locale info
 *
 * @example
 * ```tsx
 * const locales = getCommonLocales();
 * // Simpler dropdown with fewer options
 * ```
 */
export function getCommonLocales(): readonly LocaleInfo[] {
	return COMMON_LOCALES;
}

/**
 * Get locale info by code
 *
 * @param code - Locale code (e.g., 'zh-TW')
 * @returns Locale info or undefined if not found
 *
 * @example
 * ```tsx
 * const info = getLocaleByCode('zh-TW');
 * // { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', region: 'Taiwan' }
 * ```
 */
export function getLocaleByCode(code: string): LocaleInfo | undefined {
	return ALL_LOCALES.find((l) => l.code === code || l.code.toLowerCase() === code.toLowerCase());
}

/**
 * Search locales by name or native name
 *
 * @param query - Search query
 * @returns Matching locales
 *
 * @example
 * ```tsx
 * const results = searchLocales('chin');
 * // Returns Chinese, Chinese (Simplified), Chinese (Traditional)
 * ```
 */
export function searchLocales(query: string): readonly LocaleInfo[] {
	const q = query.toLowerCase();
	return ALL_LOCALES.filter(
		(l) =>
			l.code.toLowerCase().includes(q) ||
			l.name.toLowerCase().includes(q) ||
			l.nativeName.toLowerCase().includes(q)
	);
}

/**
 * Check if a locale code is valid
 *
 * @param code - Locale code to check
 * @returns True if the locale exists in our list
 *
 * @example
 * ```tsx
 * isValidLocale('zh-TW'); // true
 * isValidLocale('xx-XX'); // false
 * ```
 */
export function isValidLocale(code: string): boolean {
	return getLocaleByCode(code) !== undefined;
}
