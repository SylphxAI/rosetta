/**
 * @sylphx/lingua-drizzle - Drizzle ORM storage adapter for @sylphx/lingua
 *
 * @example
 * ```ts
 * // 1. Create schema in your Drizzle schema file
 * import { pgTable, text, timestamp, integer, boolean, unique, serial } from 'drizzle-orm/pg-core';
 * import { createLinguaSchema } from '@sylphx/lingua-drizzle/schema';
 *
 * export const { linguaSources, linguaTranslations } = createLinguaSchema({
 *   pgTable, text, timestamp, integer, boolean, unique, serial
 * });
 *
 * // 2. Use the adapter in your i18n setup
 * import { DrizzleStorageAdapter } from '@sylphx/lingua-drizzle';
 * import { I18n } from '@sylphx/lingua/server';
 *
 * const storage = new DrizzleStorageAdapter({
 *   db,
 *   sources: linguaSources,
 *   translations: linguaTranslations,
 * });
 *
 * export const i18n = new I18n({
 *   storage,
 *   defaultLocale: 'en',
 *   enabledLocales: ['en', 'zh-TW', 'ja'],
 * });
 * ```
 */

export { DrizzleStorageAdapter, type DrizzleStorageAdapterConfig, type DrizzleDatabase } from './adapter';
