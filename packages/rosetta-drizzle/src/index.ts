/**
 * @sylphx/rosetta-drizzle - Drizzle ORM storage adapter for @sylphx/rosetta
 *
 * @example
 * ```ts
 * // 1. Add schema to your Drizzle schema file
 * import { createRosettaSchema } from '@sylphx/rosetta-drizzle';
 *
 * export const { rosettaSources, rosettaTranslations } = createRosettaSchema();
 *
 * // 2. Use the adapter in your Rosetta setup
 * import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle';
 * import { createRosetta } from '@sylphx/rosetta-next/server';
 *
 * const storage = new DrizzleStorageAdapter({
 *   db,
 *   sources: rosettaSources,
 *   translations: rosettaTranslations,
 * });
 *
 * export const rosetta = createRosetta({
 *   storage,
 *   defaultLocale: 'en',
 * });
 * ```
 */

export {
	DrizzleStorageAdapter,
	type DrizzleStorageAdapterConfig,
	type DrizzleQueryBuilder,
	type SourcesTable,
	type TranslationsTable,
	type SourcesTableColumns,
	type TranslationsTableColumns,
} from './adapter';

// Re-export schema helpers from main entry (avoids drizzle-kit ESM subpath issues)
export {
	// Functions
	createRosettaSchema,
	createRosettaSchemaSQLite,
	createRosettaSchemaMySQL,
	// PostgreSQL
	pgRosettaSources,
	pgRosettaTranslations,
	pgRosettaSchema,
	// SQLite
	sqliteRosettaSources,
	sqliteRosettaTranslations,
	sqliteRosettaSchema,
	// MySQL
	mysqlRosettaSources,
	mysqlRosettaTranslations,
	mysqlRosettaSchema,
	// Types
	type RosettaSchemaOptions,
	type RosettaSourcesTable,
	type RosettaTranslationsTable,
	type PgRosettaSchema,
	type SqliteRosettaSchema,
	type MysqlRosettaSchema,
} from './schema';
