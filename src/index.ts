import {
	isNodeSqliteError,
	NodeSqliteError,
	SqlitePrimaryResultCode,
} from "#errors.js";
import {
	configurePragmas,
	type PragmaConfig,
	PragmaDefaults,
} from "#pragmas.js";
import QuickLRU from "#lru.js";
import { Mutex } from "async-mutex";
import {
	DialectAdapterBase,
	CompiledQuery,
	SelectQueryNode,
	DEFAULT_MIGRATION_LOCK_TABLE,
	DEFAULT_MIGRATION_TABLE,
	sql,
	DefaultQueryCompiler,
} from "kysely";

import type {
	TableMetadata,
	DatabaseMetadata,
	SchemaMetadata,
	DatabaseMetadataOptions,
	Kysely,
	MigrationLockOptions,
	DatabaseConnection,
	DatabaseIntrospector,
	Dialect,
	DialectAdapter,
	Driver,
	QueryCompiler,
	QueryResult,
	DefaultInsertValueNode,
} from "kysely";

export * from "#errors.js";
export * from "#pragmas.js";
export * from "#lru.js";

export class SqliteAdapter extends DialectAdapterBase {
	override get supportsTransactionalDdl(): boolean {
		return false;
	}

	override get supportsReturning(): boolean {
		return true;
	}

	override async acquireMigrationLock(
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		_db: Kysely<any>,
		_opt: MigrationLockOptions,
	): Promise<void> {}

	override async releaseMigrationLock(
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		_db: Kysely<any>,
		_opt: MigrationLockOptions,
	): Promise<void> {}
}

export interface StatementCache {
	get(sql: string): SqliteStatement | undefined;
	set(sql: string, statement: SqliteStatement): void;
	delete?(sql: string): void;
	clear?(): void;
	getStats?(): CacheStats;
}

interface CacheStats {
	hits: number;
	misses: number;
	size: number;
	evictions: number;
	totalQueries: number;
}

export type StatementCacheOption =
	| boolean
	| StatementCache
	| {
			maxSize: number;
			maxAge?: number;
			onEviction?: (sql: string, statement: SqliteStatement) => void;
	  };

export interface SqliteDialectConfig {
	database: SqliteDatabase | (() => Promise<SqliteDatabase>);
	onCreateConnection?: (connection: DatabaseConnection) => Promise<void>;
	mode?: keyof typeof PragmaDefaults;
	pragmaConfig?: PragmaConfig;
	transactionMode?: "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE";
	stmntCache?: StatementCacheOption;
}

export interface SqliteDatabase {
	close(): void;
	prepare(sql: string): SqliteStatement;
}

export interface SqliteStatement {
	all(...parameters: ReadonlyArray<unknown>): unknown[];
	run(...parameters: ReadonlyArray<unknown>): {
		changes: number | bigint;
		lastInsertRowid: number | bigint;
	};
	iterate(...parameters: ReadonlyArray<unknown>): IterableIterator<unknown>;
}

const ID_WRAP_REGEX = /"/g;

export class SqliteQueryCompiler extends DefaultQueryCompiler {
	protected override getCurrentParameterPlaceholder() {
		return "?";
	}
	protected override getLeftExplainOptionsWrapper(): string {
		return "";
	}
	protected override getRightExplainOptionsWrapper(): string {
		return "";
	}
	protected override getLeftIdentifierWrapper(): string {
		return '"';
	}
	protected override getRightIdentifierWrapper(): string {
		return '"';
	}
	protected override getAutoIncrement() {
		return "autoincrement";
	}
	protected override sanitizeIdentifier(identifier: string): string {
		return identifier.replace(ID_WRAP_REGEX, '""');
	}
	protected override visitDefaultInsertValue(_: DefaultInsertValueNode): void {
		this.append("null");
	}
}

export class SqliteIntrospector implements DatabaseIntrospector {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	readonly #db: Kysely<any>;

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	constructor(db: Kysely<any>) {
		this.#db = db;
	}

	async getSchemas(): Promise<SchemaMetadata[]> {
		return [];
	}

	async getTables(
		options: DatabaseMetadataOptions = { withInternalKyselyTables: false },
	): Promise<TableMetadata[]> {
		let query = this.#db
			.selectFrom("sqlite_master")
			.where("type", "in", ["table", "view"])
			.where("name", "not like", "sqlite_%")
			.select("name")
			.orderBy("name")
			.$castTo<{ name: string }>();

		if (!options.withInternalKyselyTables) {
			query = query
				.where("name", "!=", DEFAULT_MIGRATION_TABLE)
				.where("name", "!=", DEFAULT_MIGRATION_LOCK_TABLE);
		}

		const tables = await query.execute();
		return Promise.all(tables.map(({ name }) => this.#getTableMetadata(name)));
	}

	async getMetadata(
		options?: DatabaseMetadataOptions,
	): Promise<DatabaseMetadata> {
		return { tables: await this.getTables(options) };
	}

	async #getTableMetadata(table: string): Promise<TableMetadata> {
		const db = this.#db;
		const tableDefinition = await db
			.selectFrom("sqlite_master")
			.where("name", "=", table)
			.select(["sql", "type"])
			.$castTo<{ sql: string | undefined; type: string }>()
			.executeTakeFirstOrThrow();

		const autoIncrementCol = tableDefinition.sql
			?.split(/[\(\),]/)
			?.find((it) => it.toLowerCase().includes("autoincrement"))
			?.trimStart()
			?.split(/\s+/)?.[0]
			?.replace(/["`]/g, "");

		const columns = await db
			.selectFrom(
				sql<{
					name: string;
					type: string;
					notnull: 0 | 1;
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					dflt_value: any;
				}>`pragma_table_info(${table})`.as("table_info"),
			)
			.select(["name", "type", "notnull", "dflt_value"])
			.orderBy("cid")
			.execute();

		return {
			name: table,
			isView: tableDefinition.type === "view",
			columns: columns.map((col) => ({
				name: col.name,
				dataType: col.type,
				isNullable: !col.notnull,
				isAutoIncrementing: col.name === autoIncrementCol,
				hasDefaultValue: col.dflt_value != null,
				comment: undefined,
			})),
		};
	}
}

class EnhancedStatementCache implements StatementCache {
	private cache: QuickLRU<string, SqliteStatement>;
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		size: 0,
		evictions: 0,
		totalQueries: 0,
	};

	constructor(options: {
		maxSize: number;
		maxAge?: number;
		onEviction?: (sql: string, statement: SqliteStatement) => void;
	}) {
		this.cache = new QuickLRU({
			maxSize: options.maxSize,
			maxAge: options.maxAge,
			onEviction: (sql, stmt) => {
				this.stats.evictions++;
				options.onEviction?.(sql, stmt);
			},
		});
	}

	get(sql: string): SqliteStatement | undefined {
		this.stats.totalQueries++;
		const stmt = this.cache.get(sql);
		if (stmt) {
			this.stats.hits++;
		} else {
			this.stats.misses++;
		}
		return stmt;
	}

	set(sql: string, statement: SqliteStatement): void {
		this.cache.set(sql, statement);
		this.stats.size = this.cache.size;
	}

	delete(sql: string): void {
		this.cache.delete(sql);
		this.stats.size = this.cache.size;
	}

	clear(): void {
		this.cache.clear();
		this.stats.size = 0;
	}

	getStats(): CacheStats {
		return { ...this.stats };
	}
}

function createStatementCache(option: StatementCacheOption): StatementCache {
	if (option === true) {
		return new EnhancedStatementCache({ maxSize: 1000 });
	}
	if (option === false) {
		return createDefaultStatementCache();
	}
	if ("maxSize" in option) {
		return new EnhancedStatementCache(option);
	}
	return option;
}

function createDefaultStatementCache(): StatementCache {
	const cacheMap = new Map<string, SqliteStatement>();
	return {
		get(sql: string) {
			return cacheMap.get(sql);
		},
		set(sql: string, stmt: SqliteStatement) {
			cacheMap.set(sql, stmt);
		},
		delete(sql: string) {
			cacheMap.delete(sql);
		},
		clear() {
			cacheMap.clear();
		},
	};
}

export class SqliteDialect implements Dialect {
	readonly #config: SqliteDialectConfig;

	constructor(config: SqliteDialectConfig) {
		this.#config = Object.freeze({ ...config });
	}

	createDriver(): Driver {
		return new SqliteDriver(this.#config);
	}

	createQueryCompiler(): QueryCompiler {
		return new SqliteQueryCompiler();
	}

	createAdapter(): DialectAdapter {
		return new SqliteAdapter();
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	createIntrospector(db: Kysely<any>): DatabaseIntrospector {
		return new SqliteIntrospector(db);
	}
}

export class SqliteDriver implements Driver {
	readonly #config: SqliteDialectConfig;
	readonly #mutex = new Mutex();
	#db: SqliteDatabase | undefined;
	#connection: SqliteConnection | undefined;
	#cache: StatementCache | undefined;

	constructor(config: SqliteDialectConfig) {
		this.#config = Object.freeze({ ...config });
	}

	async init(): Promise<void> {
		await this.#mutex.runExclusive(async () => {
			const dbOrFunc = this.#config.database;
			let db: SqliteDatabase | undefined;

			try {
				if (typeof dbOrFunc === "function") {
					db = await dbOrFunc();
				} else {
					db = dbOrFunc;
				}

				if (!db) {
					throw new Error(
						"Failed to initialize SQLite driver: no database instance",
					);
				}

				this.#db = db;

				const { stmntCache } = this.#config;
				if (stmntCache) {
					this.#cache = createStatementCache(stmntCache);
				}

				this.#connection = new SqliteConnection(this.#db, this.#cache);

				if (this.#config.mode || this.#config.pragmaConfig) {
					const mergedPragmas: PragmaConfig = {
						...(this.#config.mode ? PragmaDefaults[this.#config.mode] : {}),
						...this.#config.pragmaConfig,
					};
					await this.#applyPragmas(mergedPragmas);
				}

				await this.#config.onCreateConnection?.(this.#connection);
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`SQLite initialization failed: ${error.message}`);
				}
				throw error;
			}
		});
	}

	async acquireConnection(): Promise<DatabaseConnection> {
		const release = await this.#mutex.acquire();
		try {
			if (!this.#connection) {
				throw new Error("Failed to acquire connection: driver not initialized");
			}
			return this.#connection;
		} catch (error) {
			release();
			throw error;
		}
	}

	async beginTransaction(connection: DatabaseConnection): Promise<void> {
		const mode = this.#config.transactionMode ?? "DEFERRED";
		await connection.executeQuery(CompiledQuery.raw(`BEGIN ${mode}`));
	}

	async commitTransaction(connection: DatabaseConnection): Promise<void> {
		await connection.executeQuery(CompiledQuery.raw("COMMIT"));
	}

	async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
		await connection.executeQuery(CompiledQuery.raw("ROLLBACK"));
	}

	async releaseConnection(): Promise<void> {
		if (this.#mutex.isLocked()) {
			this.#mutex.release();
		}
	}

	async destroy(): Promise<void> {
		await this.#mutex.runExclusive(async () => {
			if (this.#cache?.clear) {
				this.#cache.clear();
			}
			if (this.#db) {
				this.#db.close();
				this.#db = undefined;
			}
			this.#connection = undefined;
		});
	}

	async #applyPragmas(config: PragmaConfig): Promise<void> {
		if (!this.#connection) {
			throw new Error("Cannot apply PRAGMAs: no connection available");
		}

		const connection = this.#connection;
		const executor = {
			execute: async (stmt: string) => {
				await connection.executeQuery(CompiledQuery.raw(stmt));
			},
		};

		await configurePragmas(executor, config);
	}
}

class SqliteConnection implements DatabaseConnection {
	#db: SqliteDatabase;
	#cache?: StatementCache;

	constructor(db: SqliteDatabase, cache?: StatementCache) {
		this.#db = db;
		this.#cache = cache;
	}

	executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
		const { sql, parameters, query } = compiledQuery;

		try {
			const stmt = this.#prepareStatement(sql);

			if (SelectQueryNode.is(query)) {
				const rows = stmt.all(...parameters) as O[];
				return Promise.resolve({ rows });
			}

			const { changes, lastInsertRowid } = stmt.run(...parameters);
			const numAffectedRows =
				changes !== undefined && changes !== null ? BigInt(changes) : undefined;
			const insertId =
				lastInsertRowid !== undefined && lastInsertRowid !== null
					? BigInt(lastInsertRowid)
					: undefined;

			return Promise.resolve({
				numAffectedRows,
				insertId,
				rows: [],
			});
		} catch (error) {
			if (isNodeSqliteError(error)) {
				// Check specific error conditions using the proper error codes
				if (
					error.getPrimaryResultCode() === SqlitePrimaryResultCode.SQLITE_NOMEM
				) {
					throw new NodeSqliteError(
						"ERR_SQLITE_OOM",
						SqlitePrimaryResultCode.SQLITE_NOMEM,
						"out of memory",
						"Database operation failed due to memory constraints. Consider reducing cache size or query complexity.",
						error,
					);
				}

				if (
					error.getPrimaryResultCode() ===
						SqlitePrimaryResultCode.SQLITE_BUSY ||
					error.getPrimaryResultCode() === SqlitePrimaryResultCode.SQLITE_LOCKED
				) {
					throw new NodeSqliteError(
						"ERR_SQLITE_LOCKED",
						error.getPrimaryResultCode(),
						"database locked",
						"Database is locked. Consider adjusting busy timeout or check for concurrent access.",
						error,
					);
				}

				// For other SQLite-specific errors, preserve the original error code
				throw error;
			}

			if (
				error instanceof Error &&
				"code" in error &&
				"errcode" in error &&
				"errstr" in error
			) {
				throw NodeSqliteError.fromNodeSqlite(
					error as Error & {
						code?: string;
						errcode?: number;
						errstr?: string;
					},
				);
			}

			throw error;
		}
	}

	#prepareStatement(sql: string): SqliteStatement {
		if (!this.#cache) {
			try {
				return this.#db.prepare(sql);
			} catch (error) {
				if (isNodeSqliteError(error)) {
					// Check for specific error types using proper SQLite error codes
					if (
						error.getPrimaryResultCode() ===
						SqlitePrimaryResultCode.SQLITE_ERROR
					) {
						// Syntax errors are reported with SQLITE_ERROR primary code
						throw new NodeSqliteError(
							"ERR_SQLITE_SYNTAX",
							SqlitePrimaryResultCode.SQLITE_ERROR,
							"syntax error",
							`SQL syntax error in statement: ${sql}`,
							error,
						);
					}

					if (
						error.getPrimaryResultCode() ===
						SqlitePrimaryResultCode.SQLITE_SCHEMA
					) {
						throw new NodeSqliteError(
							"ERR_SQLITE_SCHEMA",
							SqlitePrimaryResultCode.SQLITE_SCHEMA,
							"schema error",
							`Table not found in statement: ${sql}`,
							error,
						);
					}

					// Preserve the original error code for other SQLite-specific errors
					throw error;
				}
				throw error;
			}
		}

		const cached = this.#cache.get(sql);
		if (cached) {
			return cached;
		}

		try {
			const stmt = this.#db.prepare(sql);
			this.#cache.set(sql, stmt);
			return stmt;
		} catch (error) {
			if (isNodeSqliteError(error)) {
				if (
					error.getPrimaryResultCode() === SqlitePrimaryResultCode.SQLITE_NOMEM
				) {
					this.#cache.clear?.();
					throw new NodeSqliteError(
						"ERR_SQLITE_OOM",
						SqlitePrimaryResultCode.SQLITE_NOMEM,
						"out of memory",
						"Failed to prepare statement due to memory constraints. Cache has been cleared.",
						error,
					);
				}
				throw error;
			}
			throw error;
		}
	}
	async *streamQuery<R>(
		compiledQuery: CompiledQuery,
		_chunkSize: number,
	): AsyncIterableIterator<QueryResult<R>> {
		const { sql, parameters, query } = compiledQuery;

		if (!SelectQueryNode.is(query)) {
			throw new Error(
				"SQLite driver only supports streaming of SELECT queries",
			);
		}

		try {
			const stmt = this.#db.prepare(sql);
			const iter = stmt.iterate(...parameters) as IterableIterator<R>;

			for (const row of iter) {
				yield { rows: [row] };
			}
		} catch (error) {
			if (isNodeSqliteError(error)) {
				if (error.message.includes("out of memory")) {
					this.#cache?.clear?.();
				}
				throw error;
			}

			if (
				error instanceof Error &&
				"code" in error &&
				"errcode" in error &&
				"errstr" in error
			) {
				throw NodeSqliteError.fromNodeSqlite(
					error as Error & {
						code?: string;
						errcode?: number;
						errstr?: string;
					},
				);
			}

			throw error;
		}
	}

	getCacheStats(): CacheStats | undefined {
		return this.#cache?.getStats?.();
	}
}
