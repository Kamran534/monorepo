import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

const isDev = process.env.ELECTRON_RENDERER_URL;

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
    await win.loadURL(process.env.ELECTRON_RENDERER_URL!);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
