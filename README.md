# @takinprofit/kysely-node-sqlite

A powerful SQLite dialect for [Kysely](https://github.com/kysely-org/kysely), leveraging the native Node.js SQLite module (node:sqlite). This dialect provides robust statement caching, comprehensive error handling, and configurable pragma settings for optimal SQLite performance.

[![NPM Version](https://img.shields.io/npm/v/@takinprofit/kysely-node-sqlite)](https://www.npmjs.com/package/@takinprofit/kysely-node-sqlite)
[![License](https://img.shields.io/npm/l/@takinprofit/kysely-node-sqlite)](https://github.com/takinprofit/kysely-node-sqlite/blob/main/LICENSE)

## Features

- 🚀 Built for the native Node.js SQLite module (node:sqlite)
- 💾 Intelligent statement caching with LRU implementation
- ⚡ Configurable SQLite pragma settings for different environments
- 🛡️ Comprehensive error handling with detailed SQLite error codes
- 🔄 Transaction support with configurable isolation levels
- 📊 Database introspection capabilities
- 🔍 Advanced query compilation
- 💪 TypeScript support

## Installation

```bash
npm install @takinprofit/kysely-node-sqlite kysely
```

## Usage

### Basic Setup

```typescript
import { Kysely } from 'kysely'
import { SqliteDialect } from '@takinprofit/kysely-node-sqlite'
import { DatabaseSync } from 'node:sqlite'

interface Database {
  users: {
    id: number
    name: string
    created_at: Date
  }
}

const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new DatabaseSync('path/to/database.db')
  })
})
```

### With Statement Caching

```typescript
const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new DatabaseSync('path/to/database.db'),
    stmntCache: {
      maxSize: 1000,
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  })
})
```

### Environment-specific Pragma Configuration

```typescript
import { PragmaDefaults } from '@takinprofit/kysely-node-sqlite'

const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new DatabaseSync('path/to/database.db'),
    mode: 'production', // Uses production pragma defaults
    // Or customize specific pragmas
    pragmaConfig: {
      journalMode: 'WAL',
      synchronous: 'NORMAL',
      foreignKeys: true,
      // ... other pragma settings
    }
  })
})
```

### Error Handling

```typescript
import { isNodeSqliteError, SqliteConstraints } from '@takinprofit/kysely-node-sqlite'

try {
  await db.insertInto('users')
    .values({
      id: 1,
      name: 'John',
      created_at: new Date()
    })
    .execute()
} catch (error) {
  if (SqliteConstraints.isUniqueConstraint(error)) {
    console.log('Duplicate entry detected')
  } else if (SqliteConstraints.isForeignKeyConstraint(error)) {
    console.log('Foreign key violation')
  } else if (isNodeSqliteError(error)) {
    console.log(`SQLite error: ${error.errorType}`)
  }
}
```

### Transaction Support

```typescript
await db.transaction().execute(async (trx) => {
  await trx.insertInto('users')
    .values({
      id: 1,
      name: 'John',
      created_at: new Date()
    })
    .execute()
})
```

## Configuration Options

### SqliteDialectConfig

```typescript
interface SqliteDialectConfig {
  // Required: SQLite database instance or factory function
  database: SqliteDatabase | (() => Promise<SqliteDatabase>)

  // Optional: Called after connection is established
  onCreateConnection?: (connection: DatabaseConnection) => Promise<void>

  // Optional: Environment mode for pragma defaults
  mode?: 'development' | 'testing' | 'production'

  // Optional: Custom pragma configuration
  pragmaConfig?: PragmaConfig

  // Optional: Transaction isolation mode
  transactionMode?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE'

  // Optional: Statement cache configuration
  stmntCache?: StatementCacheOption
}
```

### PragmaConfig

```typescript
interface PragmaConfig {
  journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF'
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA'
  cacheSize?: number
  mmapSize?: number
  tempStore?: 'DEFAULT' | 'FILE' | 'MEMORY'
  lockingMode?: 'NORMAL' | 'EXCLUSIVE'
  busyTimeout?: number
  foreignKeys?: boolean
  walAutocheckpoint?: number
  trustedSchema?: boolean
}
```

## Error Types

The library provides comprehensive error handling through the `NodeSqliteError` class and utility functions:

```typescript
import {
  isNodeSqliteError,
  SqliteConstraints,
  type NodeSqliteErrorData
} from '@takinprofit/kysely-node-sqlite'

// Check for specific constraint violations
SqliteConstraints.isUniqueConstraint(error)
SqliteConstraints.isForeignKeyConstraint(error)
SqliteConstraints.isNotNullConstraint(error)
SqliteConstraints.isCheckConstraint(error)

// Access detailed error information
if (isNodeSqliteError(error)) {
  console.log(error.errorType)    // Type of error
  console.log(error.code)         // Error code
  console.log(error.errcode)      // SQLite error code
  console.log(error.errstr)       // SQLite error string
}
```

## License

BSD-style license found in the LICENSE file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [Kysely](https://kysely.dev/) - The SQL query builder this dialect is built for
- [Node.js SQLite](https://nodejs.org/api/sqlite.html) - The native SQLite implementation