/**
 * Server-side i18n module
 *
 * @example
 * import { I18n, t, flushCollectedStrings } from '@sylphx/rosetta/server';
 *
 * const i18n = new I18n({
 *   storage: myStorageAdapter,
 *   localeDetector: () => cookies().get('locale')?.value ?? 'en',
 * });
 *
 * // In layout.tsx
 * export default async function Layout({ children }) {
 *   return i18n.init(async () => {
 *     const result = <html><body>{children}</body></html>;
 *     await flushCollectedStrings(); // Flush at end of request
 *     return result;
 *   });
 * }
 *
 * // In any server component
 * import { t } from '@sylphx/rosetta/server';
 * export function MyComponent() {
 *   return <h1>{t("Hello World")}</h1>;
 * }
 */

export {
	flushCollectedStrings,
	getDefaultLocale,
	getI18nContext,
	getLocale,
	getTranslations,
	getTranslationsForClient,
	i18nStorage,
	runWithI18n,
	t,
} from './context';
export type { I18nConfig, LocaleDetector } from './i18n';
export { I18n } from './i18n';
