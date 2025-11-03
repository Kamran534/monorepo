/**
 * Database Migration System
 *
 * This module provides cross-platform database migration capabilities for:
 * - Desktop (Electron with better-sqlite3)
 * - Mobile (React Native with react-native-sqlite-storage)
 * - Web (Browser with sql.js)
 */

import migration001 from './001-pos-phase1-schema.sql?raw';
import migration002 from './002-pos-phase1-views-triggers.sql?raw';

export interface Migration {
  version: string;
  description: string;
  sql: string;
}

/**
 * List of all migrations in order
 */
export const migrations: Migration[] = [
  {
    version: '001',
    description: 'Initial POS Phase 1 Schema',
    sql: migration001,
  },
  {
    version: '002',
    description: 'POS Phase 1 Views and Triggers',
    sql: migration002,
  },
];

/**
 * Database executor interface - abstracts different SQLite implementations
 */
export interface DatabaseExecutor {
  executeSql: (sql: string, params?: unknown[]) => Promise<unknown>;
  executeBatch: (statements: string[]) => Promise<void>;
}

/**
 * Parse SQL file into individual statements
 * Handles multi-line statements, comments, triggers, and empty lines
 */
export function parseSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  const lines = sql.split('\n');
  let currentStatement = '';
  let inMultiLineComment = false;
  let inTrigger = false;
  let triggerDepth = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const upperLine = trimmedLine.toUpperCase();

    // Handle multi-line comments
    if (trimmedLine.startsWith('/*')) {
      inMultiLineComment = true;
    }
    if (inMultiLineComment) {
      if (trimmedLine.endsWith('*/')) {
        inMultiLineComment = false;
      }
      continue;
    }

    // Skip single-line comments and empty lines
    if (trimmedLine.startsWith('--') || trimmedLine === '') {
      continue;
    }

    // Detect trigger/function start
    if (upperLine.includes('CREATE TRIGGER') || upperLine.includes('CREATE VIEW')) {
      inTrigger = true;
    }

    // Track BEGIN/END depth for triggers
    if (upperLine.includes('BEGIN')) {
      triggerDepth++;
    }
    if (upperLine.includes('END')) {
      triggerDepth--;
    }

    // Add line to current statement
    currentStatement += line + '\n';

    // Check if statement is complete
    // For triggers, wait until we're out of BEGIN/END blocks AND see a semicolon
    if (trimmedLine.endsWith(';')) {
      if (inTrigger) {
        // For triggers, only end when we've closed all BEGIN/END blocks
        if (triggerDepth === 0) {
          const statement = currentStatement.trim();
          if (statement) {
            statements.push(statement);
          }
          currentStatement = '';
          inTrigger = false;
        }
        // Otherwise, continue building the trigger statement
      } else {
        // Regular statement - end on semicolon
        const statement = currentStatement.trim();
        if (statement) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

/**
 * Check which migrations have already been applied
 */
export async function getAppliedMigrations(
  executor: DatabaseExecutor
): Promise<string[]> {
  try {
    const result = (await executor.executeSql(
      'SELECT version FROM schema_migrations ORDER BY migration_id',
      [] // Explicitly pass empty array for parameters
    )) as Array<{ version: string }>;

    return result.map((row) => row.version);
  } catch (error) {
    // If table doesn't exist, no migrations have been applied
    return [];
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(
  executor: DatabaseExecutor
): Promise<{ applied: string[]; skipped: string[] }> {
  const appliedVersions = await getAppliedMigrations(executor);
  const applied: string[] = [];
  const skipped: string[] = [];

  console.log('[Migration] Starting database migrations...');
  console.log(`[Migration] Already applied: ${appliedVersions.join(', ') || 'none'}`);

  for (const migration of migrations) {
    // Skip already applied migrations
    if (appliedVersions.includes(migration.version)) {
      console.log(`[Migration] Skipping ${migration.version}: ${migration.description}`);
      skipped.push(migration.version);
      continue;
    }

    console.log(`[Migration] Applying ${migration.version}: ${migration.description}`);

    try {
      // Parse SQL into individual statements
      const statements = parseSqlStatements(migration.sql);

      console.log(`[Migration] Executing ${statements.length} SQL statements...`);

      // Execute all statements in the migration
      await executor.executeBatch(statements);

      applied.push(migration.version);
      console.log(`[Migration] ✓ Successfully applied ${migration.version}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Migration] ✗ Failed to apply ${migration.version}: ${errorMessage}`);
      throw new Error(
        `Migration ${migration.version} failed: ${errorMessage}`
      );
    }
  }

  console.log(`[Migration] Complete. Applied: ${applied.length}, Skipped: ${skipped.length}`);

  return { applied, skipped };
}

/**
 * Create a DatabaseExecutor for better-sqlite3 (Desktop Electron)
 */
export function createDesktopExecutor(db: {
  prepare: (sql: string) => {
    run: (params?: unknown[]) => { changes: number };
    all: (params?: unknown[]) => unknown[];
  };
  exec: (sql: string) => void;
}): DatabaseExecutor {
  return {
    executeSql: async (sql: string, params?: unknown[]) => {
      try {
        const trimmedSql = sql.trim().toUpperCase();

        // Use exec for DDL statements (they don't support parameters anyway)
        if (
          trimmedSql.startsWith('CREATE') ||
          trimmedSql.startsWith('DROP') ||
          trimmedSql.startsWith('ALTER') ||
          trimmedSql.startsWith('PRAGMA')
        ) {
          db.exec(sql);
          return { changes: 1 };
        }

        // Use prepare for DML statements (INSERT, UPDATE, DELETE, SELECT)
        const stmt = db.prepare(sql);
        if (trimmedSql.startsWith('SELECT')) {
          return stmt.all(params);
        } else {
          const result = stmt.run(params);
          return { changes: result.changes };
        }
      } catch (error) {
        console.error('[Desktop Executor] SQL Error:', error);
        throw error;
      }
    },

    executeBatch: async (statements: string[]) => {
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;

        try {
          const upperTrimmed = trimmed.toUpperCase();

          // Use exec for DDL statements (CREATE, DROP, ALTER, PRAGMA)
          if (
            upperTrimmed.startsWith('CREATE') ||
            upperTrimmed.startsWith('DROP') ||
            upperTrimmed.startsWith('ALTER') ||
            upperTrimmed.startsWith('PRAGMA') ||
            upperTrimmed.startsWith('INSERT')
          ) {
            db.exec(trimmed);
          } else {
            // Use prepare for other statements
            const stmt = db.prepare(trimmed);
            stmt.run();
          }
        } catch (error) {
          console.error('[Desktop Executor] Failed statement:', trimmed.substring(0, 100));
          throw error;
        }
      }
    },
  };
}

/**
 * Create a DatabaseExecutor for react-native-sqlite-storage (Mobile)
 */
export function createMobileExecutor(db: {
  executeSql: (
    sql: string,
    params?: unknown[]
  ) => Promise<Array<{ rows: { length: number; item: (i: number) => unknown; _array?: unknown[] } }>>;
}): DatabaseExecutor {
  return {
    executeSql: async (sql: string, params?: unknown[]) => {
      try {
        const [result] = await db.executeSql(sql, params || []);

        // Convert result to standard format
        const rows: unknown[] = [];
        if (result.rows._array) {
          // If _array is available, use it directly
          rows.push(...result.rows._array);
        } else {
          // Otherwise, iterate using item()
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
        }

        return rows;
      } catch (error) {
        console.error('[Mobile Executor] SQL Error:', error);
        throw error;
      }
    },

    executeBatch: async (statements: string[]) => {
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;

        try {
          await db.executeSql(trimmed, []);
        } catch (error) {
          console.error('[Mobile Executor] Failed statement:', trimmed.substring(0, 100));
          throw error;
        }
      }
    },
  };
}

/**
 * Create a DatabaseExecutor for sql.js (Web)
 */
export function createWebExecutor(db: {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  prepare: (sql: string) => {
    bind: (params: unknown[]) => void;
    step: () => boolean;
    getAsObject: () => Record<string, unknown>;
    free: () => void;
  };
  export: () => Uint8Array;
}): DatabaseExecutor {
  return {
    executeSql: async (sql: string, params?: unknown[]) => {
      try {
        const trimmedSql = sql.trim().toUpperCase();

        if (trimmedSql.startsWith('SELECT')) {
          const stmt = db.prepare(sql);
          if (params && params.length > 0) {
            stmt.bind(params);
          }

          const results: Record<string, unknown>[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();

          return results;
        } else {
          db.run(sql, params);
          return { changes: 1 };
        }
      } catch (error) {
        console.error('[Web Executor] SQL Error:', error);
        throw error;
      }
    },

    executeBatch: async (statements: string[]) => {
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;

        try {
          db.run(trimmed);
        } catch (error) {
          console.error('[Web Executor] Failed statement:', trimmed.substring(0, 100));
          throw error;
        }
      }
    },
  };
}
