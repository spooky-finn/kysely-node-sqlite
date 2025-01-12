// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * SQLite journal modes
 * @see https://www.sqlite.org/pragma.html#pragma_journal_mode
 */
export type JournalMode =
	| "DELETE"
	| "TRUNCATE"
	| "PERSIST"
	| "MEMORY"
	| "WAL"
	| "OFF";

/**
 * SQLite synchronous settings
 * @see https://www.sqlite.org/pragma.html#pragma_synchronous
 */
export type SynchronousMode = "OFF" | "NORMAL" | "FULL" | "EXTRA";

/**
 * SQLite temp store locations
 * @see https://www.sqlite.org/pragma.html#pragma_temp_store
 */
export type TempStore = "DEFAULT" | "FILE" | "MEMORY";

/**
 * SQLite locking modes
 * @see https://www.sqlite.org/pragma.html#pragma_locking_mode
 */
export type LockingMode = "NORMAL" | "EXCLUSIVE";

/**
 * Configuration options for SQLite pragmas
 */
export interface PragmaConfig {
	/** Journal mode for the database (default: WAL) */
	journalMode?: JournalMode;

	/** Synchronous setting (default: NORMAL) */
	synchronous?: SynchronousMode;

	/** Cache size in kilobytes (negative means number of pages) */
	cacheSize?: number;

	/** Maximum size of memory-mapped I/O in bytes */
	mmapSize?: number;

	/** Location for temp store (default: MEMORY) */
	tempStore?: TempStore;

	/** Locking mode (default: NORMAL) */
	lockingMode?: LockingMode;

	/** Timeout in milliseconds for busy handlers */
	busyTimeout?: number;

	/** Foreign key constraint enforcement (default: true) */
	foreignKeys?: boolean;

	/** Automatic checkpointing of WAL files */
	walAutocheckpoint?: number;

	/** Whether the schema should be trusted (default: true) */
	trustedSchema?: boolean;
}

/**
 * Default pragma configurations for different environments
 */
export const PragmaDefaults = {
	/**
	 * Development environment defaults - optimized for development workflow
	 */
	development: {
		journalMode: "WAL" as const,
		synchronous: "NORMAL" as const,
		cacheSize: -64000, // 64MB cache
		tempStore: "MEMORY" as const,
		mmapSize: 64000000, // 64MB mmap
		lockingMode: "NORMAL" as const,
		busyTimeout: 5000,
		foreignKeys: true,
		walAutocheckpoint: 1000,
		trustedSchema: true,
	},

	/**
	 * Testing environment defaults - optimized for in-memory testing
	 */
	testing: {
		journalMode: "WAL" as const,
		synchronous: "OFF" as const, // Less durable but faster for testing
		cacheSize: -32000, // 32MB cache is enough for testing
		tempStore: "MEMORY" as const,
		lockingMode: "EXCLUSIVE" as const, // Reduce lock conflicts
		busyTimeout: 5000,
		foreignKeys: true,
		walAutocheckpoint: 1000,
		trustedSchema: true,
	},

	/**
	 * Production environment defaults - optimized for durability and performance
	 */
	production: {
		journalMode: "WAL" as const,
		synchronous: "NORMAL" as const,
		cacheSize: -64000, // 64MB cache
		tempStore: "MEMORY" as const,
		mmapSize: 268435456, // 256MB mmap
		lockingMode: "NORMAL" as const,
		busyTimeout: 10000,
		foreignKeys: true,
		walAutocheckpoint: 1000,
		trustedSchema: false, // Safer default for production
	},
};

/**
 * Generates SQLite PRAGMA statements from configuration
 */
export function getPragmaStatements(config: PragmaConfig): string[] {
	const statements: string[] = [];

	if (config.journalMode) {
		statements.push(`PRAGMA journal_mode=${config.journalMode};`);
	}

	if (config.synchronous) {
		statements.push(`PRAGMA synchronous=${config.synchronous};`);
	}

	if (config.cacheSize) {
		statements.push(`PRAGMA cache_size=${config.cacheSize};`);
	}

	if (config.mmapSize) {
		statements.push(`PRAGMA mmap_size=${config.mmapSize};`);
	}

	if (config.tempStore) {
		statements.push(`PRAGMA temp_store=${config.tempStore};`);
	}

	if (config.lockingMode) {
		statements.push(`PRAGMA locking_mode=${config.lockingMode};`);
	}

	if (config.busyTimeout) {
		statements.push(`PRAGMA busy_timeout=${config.busyTimeout};`);
	}

	if (typeof config.foreignKeys === "boolean") {
		statements.push(
			`PRAGMA foreign_keys=${config.foreignKeys ? "ON" : "OFF"};`,
		);
	}

	if (config.walAutocheckpoint) {
		statements.push(`PRAGMA wal_autocheckpoint=${config.walAutocheckpoint};`);
	}

	if (typeof config.trustedSchema === "boolean") {
		statements.push(
			`PRAGMA trusted_schema=${config.trustedSchema ? "ON" : "OFF"};`,
		);
	}

	return statements;
}

/**
 * Applies pragma configuration to a database
 */
export function configurePragmas(
	db: { execute: (sql: string) => Promise<void> },
	config: PragmaConfig,
) {
	const statements = getPragmaStatements(config);
	return Promise.all(statements.map((stmt) => db.execute(stmt)));
}
