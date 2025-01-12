// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * SQLite primary result codes (least significant 8 bits)
 * @see https://www.sqlite.org/rescode.html
 */
export enum SqlitePrimaryResultCode {
	SQLITE_OK = 0, // Successful result
	SQLITE_ERROR = 1, // Generic error
	SQLITE_INTERNAL = 2, // Internal logic error in SQLite
	SQLITE_PERM = 3, // Access permission denied
	SQLITE_ABORT = 4, // Callback routine requested an abort
	SQLITE_BUSY = 5, // The database file is locked
	SQLITE_LOCKED = 6, // A table in the database is locked
	SQLITE_NOMEM = 7, // A malloc() failed
	SQLITE_READONLY = 8, // Attempt to write a readonly database
	SQLITE_INTERRUPT = 9, // Operation terminated by sqlite3_interrupt()
	SQLITE_IOERR = 10, // Some kind of disk I/O error occurred
	SQLITE_CORRUPT = 11, // The database disk image is malformed
	SQLITE_NOTFOUND = 12, // Unknown opcode in sqlite3_file_control()
	SQLITE_FULL = 13, // Insertion failed because database is full
	SQLITE_CANTOPEN = 14, // Unable to open the database file
	SQLITE_PROTOCOL = 15, // Database lock protocol error
	SQLITE_EMPTY = 16, // Internal use only
	SQLITE_SCHEMA = 17, // The database schema changed
	SQLITE_TOOBIG = 18, // String or BLOB exceeds size limit
	SQLITE_CONSTRAINT = 19, // Abort due to constraint violation
	SQLITE_MISMATCH = 20, // Data type mismatch
	SQLITE_MISUSE = 21, // Library used incorrectly
	SQLITE_NOLFS = 22, // Uses OS features not supported on host
	SQLITE_AUTH = 23, // Authorization denied
	SQLITE_FORMAT = 24, // Not used
	SQLITE_RANGE = 25, // 2nd parameter to sqlite3_bind out of range
	SQLITE_NOTADB = 26, // File opened that is not a database file
	SQLITE_NOTICE = 27, // Notifications from sqlite3_log()
	SQLITE_WARNING = 28, // Warnings from sqlite3_log()
	SQLITE_ROW = 100, // sqlite3_step() has another row ready
	SQLITE_DONE = 101, // sqlite3_step() has finished executing
}

/**
 * Extended result codes providing more detailed error information
 * @see https://www.sqlite.org/rescode.html
 */
export enum SqliteExtendedResultCode {
	// Constraint errors
	SQLITE_CONSTRAINT_CHECK = 275, // CHECK constraint failed
	SQLITE_CONSTRAINT_COMMITHOOK = 531, // Commit hook caused rollback
	SQLITE_CONSTRAINT_FOREIGNKEY = 787, // Foreign key constraint failed
	SQLITE_CONSTRAINT_FUNCTION = 1043, // Function raised error
	SQLITE_CONSTRAINT_NOTNULL = 1299, // NOT NULL constraint failed
	SQLITE_CONSTRAINT_PRIMARYKEY = 1555, // PRIMARY KEY constraint failed
	SQLITE_CONSTRAINT_TRIGGER = 1811, // TRIGGER constraint failed
	SQLITE_CONSTRAINT_UNIQUE = 2067, // UNIQUE constraint failed
	SQLITE_CONSTRAINT_VTAB = 2323, // Virtual table constraint failed
	SQLITE_CONSTRAINT_ROWID = 2579, // ROWID constraint failed
	SQLITE_CONSTRAINT_PINNED = 2835, // Pinned row cannot be deleted
	SQLITE_CONSTRAINT_DATATYPE = 3091, // Data type check failed

	// I/O errors
	SQLITE_IOERR_READ = 266, // Error reading from disk
	SQLITE_IOERR_WRITE = 778, // Error writing to disk
	SQLITE_IOERR_FSYNC = 1034, // Error on fsync
	SQLITE_IOERR_LOCK = 3850, // Error obtaining file lock
	SQLITE_IOERR_UNLOCK = 2058, // Error releasing file lock
	SQLITE_IOERR_NOMEM = 3082, // Out of memory in I/O layer

	// Busy/Locked errors
	SQLITE_BUSY_RECOVERY = 261, // Another process is recovering a WAL file
	SQLITE_BUSY_SNAPSHOT = 517, // Cannot promote read transaction to write
	SQLITE_BUSY_TIMEOUT = 773, // Timeout waiting for lock
	SQLITE_LOCKED_SHAREDCACHE = 262, // Sharing violation in shared cache mode

	// Corruption errors
	SQLITE_CORRUPT_VTAB = 267, // Virtual table content corrupt
	SQLITE_CORRUPT_SEQUENCE = 523, // sqlite_sequence table corrupt
	SQLITE_CORRUPT_INDEX = 779, // Index corrupt
}

/**
 * Maps error codes to their type strings for better error reporting
 */
export const SqliteErrorTypes = {
	// Primary result codes
	[SqlitePrimaryResultCode.SQLITE_OK]: "OK",
	[SqlitePrimaryResultCode.SQLITE_ERROR]: "GENERIC_ERROR",
	[SqlitePrimaryResultCode.SQLITE_INTERNAL]: "INTERNAL_ERROR",
	[SqlitePrimaryResultCode.SQLITE_PERM]: "PERMISSION_DENIED",
	[SqlitePrimaryResultCode.SQLITE_ABORT]: "OPERATION_ABORTED",
	[SqlitePrimaryResultCode.SQLITE_BUSY]: "DATABASE_BUSY",
	[SqlitePrimaryResultCode.SQLITE_LOCKED]: "DATABASE_LOCKED",
	[SqlitePrimaryResultCode.SQLITE_NOMEM]: "OUT_OF_MEMORY",
	[SqlitePrimaryResultCode.SQLITE_READONLY]: "DATABASE_READONLY",
	[SqlitePrimaryResultCode.SQLITE_INTERRUPT]: "OPERATION_INTERRUPTED",
	[SqlitePrimaryResultCode.SQLITE_IOERR]: "IO_ERROR",
	[SqlitePrimaryResultCode.SQLITE_CORRUPT]: "DATABASE_CORRUPT",
	[SqlitePrimaryResultCode.SQLITE_NOTFOUND]: "NOT_FOUND",
	[SqlitePrimaryResultCode.SQLITE_FULL]: "DATABASE_FULL",
	[SqlitePrimaryResultCode.SQLITE_CANTOPEN]: "CANNOT_OPEN",
	[SqlitePrimaryResultCode.SQLITE_PROTOCOL]: "PROTOCOL_ERROR",
	[SqlitePrimaryResultCode.SQLITE_SCHEMA]: "SCHEMA_CHANGED",
	[SqlitePrimaryResultCode.SQLITE_TOOBIG]: "TOO_BIG",
	[SqlitePrimaryResultCode.SQLITE_CONSTRAINT]: "CONSTRAINT_VIOLATION",
	[SqlitePrimaryResultCode.SQLITE_MISMATCH]: "TYPE_MISMATCH",
	[SqlitePrimaryResultCode.SQLITE_MISUSE]: "LIBRARY_MISUSE",
	[SqlitePrimaryResultCode.SQLITE_NOLFS]: "NO_LARGE_FILE_SUPPORT",
	[SqlitePrimaryResultCode.SQLITE_AUTH]: "AUTHORIZATION_ERROR",
	[SqlitePrimaryResultCode.SQLITE_FORMAT]: "FORMAT_ERROR",
	[SqlitePrimaryResultCode.SQLITE_RANGE]: "OUT_OF_RANGE",
	[SqlitePrimaryResultCode.SQLITE_NOTADB]: "NOT_A_DATABASE",
	[SqlitePrimaryResultCode.SQLITE_ROW]: "ROW_READY",
	[SqlitePrimaryResultCode.SQLITE_DONE]: "DONE",

	// Extended result codes - Constraints
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_CHECK]: "CHECK_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_COMMITHOOK]:
		"COMMIT_HOOK_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_FOREIGNKEY]:
		"FOREIGN_KEY_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_FUNCTION]: "FUNCTION_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_NOTNULL]: "NOT_NULL_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_PRIMARYKEY]:
		"PRIMARY_KEY_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_TRIGGER]: "TRIGGER_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_UNIQUE]: "UNIQUE_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_VTAB]: "VIRTUAL_TABLE_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_ROWID]: "ROWID_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_PINNED]: "PINNED_ROW_CONSTRAINT",
	[SqliteExtendedResultCode.SQLITE_CONSTRAINT_DATATYPE]: "DATATYPE_CONSTRAINT",

	// Extended result codes - I/O Errors
	[SqliteExtendedResultCode.SQLITE_IOERR_READ]: "IO_READ_ERROR",
	[SqliteExtendedResultCode.SQLITE_IOERR_WRITE]: "IO_WRITE_ERROR",
	[SqliteExtendedResultCode.SQLITE_IOERR_FSYNC]: "IO_FSYNC_ERROR",
	[SqliteExtendedResultCode.SQLITE_IOERR_LOCK]: "IO_LOCK_ERROR",
	[SqliteExtendedResultCode.SQLITE_IOERR_UNLOCK]: "IO_UNLOCK_ERROR",
	[SqliteExtendedResultCode.SQLITE_IOERR_NOMEM]: "IO_MEMORY_ERROR",

	// Extended result codes - Busy/Locked
	[SqliteExtendedResultCode.SQLITE_BUSY_RECOVERY]: "BUSY_RECOVERY",
	[SqliteExtendedResultCode.SQLITE_BUSY_SNAPSHOT]: "BUSY_SNAPSHOT",
	[SqliteExtendedResultCode.SQLITE_BUSY_TIMEOUT]: "BUSY_TIMEOUT",
	[SqliteExtendedResultCode.SQLITE_LOCKED_SHAREDCACHE]: "LOCKED_SHARED_CACHE",

	// Extended result codes - Corruption
	[SqliteExtendedResultCode.SQLITE_CORRUPT_VTAB]: "CORRUPT_VIRTUAL_TABLE",
	[SqliteExtendedResultCode.SQLITE_CORRUPT_SEQUENCE]: "CORRUPT_SEQUENCE",
	[SqliteExtendedResultCode.SQLITE_CORRUPT_INDEX]: "CORRUPT_INDEX",
} as const;

export type SqliteErrorType =
	(typeof SqliteErrorTypes)[keyof typeof SqliteErrorTypes];

/**
 * Error interface for node:sqlite errors
 */
export interface NodeSqliteErrorData {
	code: string;
	errcode: number;
	errstr: string;
	message: string;
	errorType: SqliteErrorType;
	originalError?: Error;
}

/**
 * Custom error class for node:sqlite errors with enhanced type information and helper methods
 */
export class NodeSqliteError extends Error implements NodeSqliteErrorData {
	public readonly errorType: SqliteErrorType;

	constructor(
		public readonly code: string,
		public readonly errcode: number,
		public readonly errstr: string,
		message: string,
		public readonly originalError?: Error,
	) {
		super(message);
		this.name = "NodeSqliteError";
		this.errorType =
			SqliteErrorTypes[errcode as keyof typeof SqliteErrorTypes] ||
			"UNKNOWN_ERROR";
		Object.setPrototypeOf(this, NodeSqliteError.prototype);
	}

	/**
	 * Gets the primary result code (least significant 8 bits)
	 */
	getPrimaryResultCode(): SqlitePrimaryResultCode {
		return this.errcode & 0xff;
	}

	/**
	 * Gets the extended result code if available
	 */
	getExtendedResultCode(): SqliteExtendedResultCode | undefined {
		return this.errcode > 255 ? this.errcode : undefined;
	}

	/**
	 * Checks if this is a constraint violation error
	 */
	isConstraintError(): boolean {
		const primary = this.getPrimaryResultCode();
		return primary === SqlitePrimaryResultCode.SQLITE_CONSTRAINT;
	}

	/**
	 * Checks if this is a specific type of constraint violation
	 */
	isConstraintType(type: SqliteExtendedResultCode): boolean {
		return this.errcode === type;
	}

	/**
	 * Checks if this is a database locked error
	 */
	isDatabaseLocked(): boolean {
		const primary = this.getPrimaryResultCode();
		return (
			primary === SqlitePrimaryResultCode.SQLITE_BUSY ||
			primary === SqlitePrimaryResultCode.SQLITE_LOCKED
		);
	}

	/**
	 * Checks if this is a corruption error
	 */
	isCorruption(): boolean {
		const primary = this.getPrimaryResultCode();
		return primary === SqlitePrimaryResultCode.SQLITE_CORRUPT;
	}

	toString(): string {
		return `NodeSqliteError: [${this.errorType}] ${this.message} (code: ${this.code}, errcode: ${this.errcode})`;
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			errcode: this.errcode,
			errstr: this.errstr,
			errorType: this.errorType,
			stack: this.stack,
		};
	}

	/**
	 * Creates a NodeSqliteError from a node:sqlite error
	 */
	static fromNodeSqlite(
		error: Error & {
			code?: string;
			errcode?: number;
			errstr?: string;
		},
	): NodeSqliteError {
		return new NodeSqliteError(
			error.code || "ERR_SQLITE_ERROR",
			error.errcode || SqlitePrimaryResultCode.SQLITE_ERROR,
			error.errstr || "unknown error",
			error.message,
			error,
		);
	}
}

/**
 * Type guard to check if an error is a NodeSqliteError
 */
export function isNodeSqliteError(error: unknown): error is NodeSqliteError {
	return (
		error instanceof NodeSqliteError ||
		(error instanceof Error &&
			"code" in error &&
			"errcode" in error &&
			"errstr" in error &&
			error.code === "ERR_SQLITE_ERROR")
	);
}

/**
 * Constraint-specific error checks
 */
export const SqliteConstraints = {
	/**
	 * Checks if an error is a UNIQUE constraint violation
	 */
	isUniqueConstraint(error: unknown): error is NodeSqliteError {
		return (
			isNodeSqliteError(error) &&
			error.errcode === SqliteExtendedResultCode.SQLITE_CONSTRAINT_UNIQUE
		);
	},

	/**
	 * Checks if an error is a FOREIGN KEY constraint violation
	 */
	isForeignKeyConstraint(error: unknown): error is NodeSqliteError {
		return (
			isNodeSqliteError(error) &&
			error.errcode === SqliteExtendedResultCode.SQLITE_CONSTRAINT_FOREIGNKEY
		);
	},

	/**
	 * Checks if an error is a NOT NULL constraint violation
	 */
	isNotNullConstraint(error: unknown): error is NodeSqliteError {
		return (
			isNodeSqliteError(error) &&
			error.errcode === SqliteExtendedResultCode.SQLITE_CONSTRAINT_NOTNULL
		);
	},

	/**
	 * Checks if an error is a CHECK constraint violation
	 */
	isCheckConstraint(error: unknown): error is NodeSqliteError {
		return (
			isNodeSqliteError(error) &&
			error.errcode === SqliteExtendedResultCode.SQLITE_CONSTRAINT_CHECK
		);
	},
} as const;
