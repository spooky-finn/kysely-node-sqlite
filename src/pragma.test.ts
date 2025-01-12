// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
	type PragmaConfig,
	PragmaDefaults,
	getPragmaStatements,
	configurePragmas,
} from "./pragmas";

describe("SQLite Pragma Configuration", async () => {
	test("getPragmaStatements should generate correct PRAGMA statements", () => {
		const config: PragmaConfig = {
			journalMode: "WAL",
			synchronous: "NORMAL",
			cacheSize: -64000,
			tempStore: "MEMORY",
			foreignKeys: true,
		};

		const statements = getPragmaStatements(config);

		assert.deepEqual(statements, [
			"PRAGMA journal_mode=WAL;",
			"PRAGMA synchronous=NORMAL;",
			"PRAGMA cache_size=-64000;",
			"PRAGMA temp_store=MEMORY;",
			"PRAGMA foreign_keys=ON;",
		]);
	});

	test("getPragmaStatements should handle boolean values correctly", () => {
		const config: PragmaConfig = {
			foreignKeys: true,
			trustedSchema: false,
		};

		const statements = getPragmaStatements(config);

		assert.deepEqual(statements, [
			"PRAGMA foreign_keys=ON;",
			"PRAGMA trusted_schema=OFF;",
		]);
	});

	test("development configuration should be complete and valid", () => {
		const statements = getPragmaStatements(PragmaDefaults.development);

		assert(statements.length > 0);
		assert(statements.every((stmt) => stmt.startsWith("PRAGMA ")));
		assert(statements.every((stmt) => stmt.endsWith(";")));

		// Check specific development settings
		assert(statements.includes("PRAGMA journal_mode=WAL;"));
		assert(statements.includes("PRAGMA synchronous=NORMAL;"));
		assert(statements.includes("PRAGMA cache_size=-64000;"));
	});

	test("testing configuration should be optimized for speed", () => {
		const statements = getPragmaStatements(PragmaDefaults.testing);

		assert(statements.includes("PRAGMA synchronous=OFF;"));
		assert(statements.includes("PRAGMA locking_mode=EXCLUSIVE;"));
		assert(statements.includes("PRAGMA temp_store=MEMORY;"));
	});

	test("production configuration should be optimized for safety", () => {
		const statements = getPragmaStatements(PragmaDefaults.production);

		assert(statements.includes("PRAGMA trusted_schema=OFF;"));
		assert(statements.includes("PRAGMA synchronous=NORMAL;"));
		assert(statements.includes("PRAGMA foreign_keys=ON;"));
	});

	test("configurePragmas should execute all statements", async () => {
		const executedStatements: string[] = [];
		const mockDb = {
			execute: async (sql: string) => {
				executedStatements.push(sql);
			},
		};

		const config: PragmaConfig = {
			journalMode: "WAL",
			synchronous: "NORMAL",
		};

		await configurePragmas(mockDb, config);

		assert.deepEqual(executedStatements, [
			"PRAGMA journal_mode=WAL;",
			"PRAGMA synchronous=NORMAL;",
		]);
	});

	test("empty config should generate no statements", () => {
		const statements = getPragmaStatements({});
		assert.equal(statements.length, 0);
	});
});
