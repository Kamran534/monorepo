import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import path from 'node:path';
import { createDesktopExecutor, runMigrations } from '@monorepo/db/migrations';

const isDev = process.env.ELECTRON_RENDERER_URL;

// Database instance - initialized once at app startup
let db: Database.Database | null = null;
let getStmt: Database.Statement | null = null;
let upsertStmt: Database.Statement | null = null;

/**
 * Run database migrations
 * @throws {Error} If migration fails
 */
async function runDatabaseMigrations(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    console.log('[Database] Running migrations...');
    const executor = createDesktopExecutor(db);
    const result = await runMigrations(executor);
    console.log(`[Database] Migrations complete. Applied: ${result.applied.length}, Skipped: ${result.skipped.length}`);
  } catch (error) {
    console.error('[Database] Migration failed:', error);
    throw error;
  }
}

/**
 * Initialize the SQLite database connection
 * @throws {Error} If database initialization fails
 */
async function initializeDatabase(): Promise<void> {
  try {
    const userData = app.getPath('userData');
    const dbPath = path.join(userData, 'payflow.db');

    console.log(`[Database] Opening database at ${dbPath}`);

    // Open database connection
    db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    console.log(`[Database] Database opened successfully`);

    // Run migrations to set up the POS schema
    await runDatabaseMigrations();

    // Create legacy kv table if it doesn't exist (for backward compatibility)
    db.prepare('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value INTEGER)').run();

    // Prepare statements for reuse (better performance)
    getStmt = db.prepare('SELECT value FROM kv WHERE key = ?');
    upsertStmt = db.prepare(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
    );

    console.log(`[Database] Initialized successfully at ${dbPath}`);
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
    if (getStmt && typeof getStmt.finalize === 'function') {
      getStmt.finalize();
      getStmt = null;
    }
    if (upsertStmt && typeof upsertStmt.finalize === 'function') {
      upsertStmt.finalize();
      upsertStmt = null;
    }
    if (db && typeof db.close === 'function') {
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

  // Print handler for silent printing
  ipcMain.handle('print-content', async (event, options) => {
    try {
      console.log('[Print] Starting silent print...');
      
      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML content
      const htmlContent = options?.htmlContent || '';
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Wait for content to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Print silently
      const printOptions = {
        silent: options?.silent ?? true,
        printBackground: options?.printBackground ?? true,
        deviceName: options?.deviceName || '',
      };

      console.log('[Print] Printing with options:', printOptions);

      return new Promise((resolve, reject) => {
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          printWindow.close();
          
          if (success) {
            console.log('[Print] Print successful');
            resolve({ success: true });
          } else {
            console.error('[Print] Print failed:', failureReason);
            reject(new Error(failureReason || 'Print failed'));
          }
        });
      });
    } catch (error) {
      console.error('[IPC] print-content error:', error);
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
    autoHideMenuBar: true, // Hide menu bar (File, Edit, View, etc.)
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Enable DevTools in production for debugging
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Window] Failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error('[Window] Renderer process gone:', details.reason);
  });

  if (isDev) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (!rendererUrl) {
      throw new Error('ELECTRON_RENDERER_URL is not defined in development mode');
    }
    await win.loadURL(rendererUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererPath = join(__dirname, '../renderer/index.html');
    console.log('[Window] Loading renderer from:', rendererPath);
    await win.loadFile(rendererPath);
    // Enable DevTools in production for debugging white screen
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// Initialize database and setup IPC handlers once at app startup
app.whenReady().then(async () => {
  try {
    // Remove the default menu bar completely
    Menu.setApplicationMenu(null);

    await initializeDatabase();
    setupIpcHandlers();
    await createWindow();

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
