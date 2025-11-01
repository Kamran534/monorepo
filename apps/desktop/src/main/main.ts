import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import path from 'node:path';

const isDev = process.env.ELECTRON_RENDERER_URL;

// Database instance - initialized once at app startup
let db: Database.Database | null = null;
let getStmt: Database.Statement | null = null;
let upsertStmt: Database.Statement | null = null;

/**
 * Initialize the SQLite database connection
 * @throws {Error} If database initialization fails
 */
function initializeDatabase(): void {
  try {
    const userData = app.getPath('userData');
    const dbPath = path.join(userData, 'payflow.db');
    
    // Open database connection
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    // Create table if it doesn't exist
    db.prepare('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value INTEGER)').run();
    
    // Prepare statements for reuse (better performance)
    getStmt = db.prepare('SELECT value FROM kv WHERE key = ?');
    upsertStmt = db.prepare(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
    );
    
    console.log(`[Database] Initialized at ${dbPath}`);
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Close the database connection gracefully
 */
function closeDatabase(): void {
  try {
    if (getStmt) {
      getStmt.finalize();
      getStmt = null;
    }
    if (upsertStmt) {
      upsertStmt.finalize();
      upsertStmt = null;
    }
    if (db) {
      db.close();
      db = null;
      console.log('[Database] Connection closed');
    }
  } catch (error) {
    console.error('[Database] Error closing connection:', error);
  }
}

/**
 * Read counter value from database
 * @returns {number} Current counter value
 * @throws {Error} If database operation fails
 */
function readCounter(): number {
  if (!getStmt || !db) {
    throw new Error('Database not initialized');
  }
  
  try {
    const row = getStmt.get('counter') as { value: number } | undefined;
    return row ? Number(row.value) : 0;
  } catch (error) {
    console.error('[Database] Error reading counter:', error);
    throw new Error(`Failed to read counter: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Write counter value to database
 * @param {number} value - Counter value to write
 * @returns {number} The value that was written
 * @throws {Error} If database operation fails
 */
function writeCounter(value: number): number {
  if (!upsertStmt || !db) {
    throw new Error('Database not initialized');
  }
  
  try {
    upsertStmt.run('counter', value);
    return value;
  } catch (error) {
    console.error('[Database] Error writing counter:', error);
    throw new Error(`Failed to write counter: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Setup IPC handlers for database operations
 */
function setupIpcHandlers(): void {
  ipcMain.handle('db/connect', async () => {
    try {
      if (!db) {
        throw new Error('Database not initialized');
      }
      return true;
    } catch (error) {
      console.error('[IPC] db/connect error:', error);
      throw error;
    }
  });

  ipcMain.handle('db/getCounter', async () => {
    try {
      return readCounter();
    } catch (error) {
      console.error('[IPC] db/getCounter error:', error);
      throw error;
    }
  });

  ipcMain.handle('db/increment', async () => {
    try {
      const currentValue = readCounter();
      return writeCounter(currentValue + 1);
    } catch (error) {
      console.error('[IPC] db/increment error:', error);
      throw error;
    }
  });

  ipcMain.handle('db/decrement', async () => {
    try {
      const currentValue = readCounter();
      return writeCounter(currentValue - 1);
    } catch (error) {
      console.error('[IPC] db/decrement error:', error);
      throw error;
    }
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'PayFlow',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
    },
  });

  if (isDev) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (!rendererUrl) {
      throw new Error('ELECTRON_RENDERER_URL is not defined in development mode');
    }
    await win.loadURL(rendererUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Initialize database and setup IPC handlers once at app startup
app.whenReady().then(() => {
  try {
    initializeDatabase();
    setupIpcHandlers();
    createWindow();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[App] Failed to initialize:', error);
    app.quit();
  }
});

// Close database connection when all windows are closed
app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure database is closed when app quits
app.on('will-quit', () => {
  closeDatabase();
});

// Handle app termination gracefully
process.on('SIGINT', () => {
  closeDatabase();
  app.quit();
});

process.on('SIGTERM', () => {
  closeDatabase();
  app.quit();
});
