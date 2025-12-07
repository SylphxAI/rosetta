/**
 * @sylphx/rosetta-drizzle - Drizzle ORM storage adapter for @sylphx/rosetta
 *
 * @example
 * ```ts
 * // 1. Create schema in your Drizzle schema file
 * import { pgTable, text, timestamp, integer, boolean, unique, serial } from 'drizzle-orm/pg-core';
 * import { createRosettaSchema } from '@sylphx/rosetta-drizzle';
 *
 * export const { rosettaSources, rosettaTranslations } = createRosettaSchema({
 *   pgTable, text, timestamp, integer, boolean, unique, serial
 * });
 *
 * // 2. Use the adapter in your Rosetta setup
 * import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle';
 * import { Rosetta } from '@sylphx/rosetta/server';
 *
 * const storage = new DrizzleStorageAdapter({
 *   db,
 *   sources: rosettaSources,
 *   translations: rosettaTranslations,
 * });
 *
 * export const rosetta = new Rosetta({
 *   storage,
 *   defaultLocale: 'en',
 * });
 * ```
 */

export {
	DrizzleStorageAdapter,
	type DrizzleStorageAdapterConfig,
	type DrizzleDatabase,
} from './adapter';

// Re-export schema helpers from main entry (avoids drizzle-kit ESM subpath issues)
export {
	createRosettaSchema,
	createRosettaSchemaSQLite,
	createRosettaSchemaMySQL,
	type PostgresSchemaHelpers,
	type SQLiteSchemaHelpers,
	type MySQLSchemaHelpers,
	type RosettaSchemaOptions,
} from './schema';
