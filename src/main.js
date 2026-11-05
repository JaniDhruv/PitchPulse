import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import started from 'electron-squirrel-startup';
import { bindSmartSpectraIpc } from '@smartspectra/node-sdk/main';

// Load environment variables from .env
dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow = null;
let customApiKey = process.env.SMARTSPECTRA_API_KEY || '';

const getSessionsDir = () => {
  const dir = path.join(app.getPath('userData'), 'pitchpulse_sessions');
  return dir;
};

const ensureSessionsDir = async () => {
  const dir = getSessionsDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error('Failed to create sessions dir:', err);
  }
  return dir;
};

const setupIpcHandlers = () => {
  ipcMain.handle('pitchpulse:get-api-key', () => {
    return customApiKey || process.env.SMARTSPECTRA_API_KEY || '';
  });

  ipcMain.handle('pitchpulse:save-api-key', (_event, key) => {
    customApiKey = key.trim();
    return true;
  });

  ipcMain.handle('pitchpulse:save-session', async (_event, sessionData) => {
    try {
      const dir = await ensureSessionsDir();
      const filename = `session_${sessionData.id || Date.now()}.json`;
      const filePath = path.join(dir, filename);
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Failed to save session:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('pitchpulse:load-sessions', async () => {
    try {
      const dir = await ensureSessionsDir();
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const sessions = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          sessions.push(JSON.parse(content));
        } catch {
          // Ignore corrupt files
        }
      }
      // Sort newest first
      sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return sessions;
    } catch (err) {
      console.error('Failed to load sessions:', err);
      return [];
    }
  });

  ipcMain.handle('pitchpulse:delete-session', async (_event, id) => {
    try {
      const dir = await ensureSessionsDir();
      const filePath = path.join(dir, `session_${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (err) {
      console.error('Failed to delete session:', err);
      return false;
    }
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b0f19',
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Wire Presage SmartSpectra IPC binding for this window
  bindSmartSpectraIpc(mainWindow, {
    logger: (level, msg) => {
      if (level === 'error') {
        console.error(`[SmartSpectra IPC] ${msg}`);
      } else if (process.env.SMARTSPECTRA_DIAGNOSTICS === '1') {
        console.log(`[SmartSpectra IPC:${level}] ${msg}`);
      }
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in dev mode
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
