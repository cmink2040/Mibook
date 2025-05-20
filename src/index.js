// src/main/index.js (ESM)
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// 1) Shim __dirname & __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // preload: path.join(__dirname, 'preload.js'), // if you have one
    },
  });

  try {
    if (isDev) {
      // will reject if Vite server isn’t up
      await win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
    } else {
      // make sure this path actually exists in your built output
      await win.loadFile(path.join(__dirname, '../src/index.html'));
    }
  } catch (err) {
    console.error('❌ createWindow failed to load content:', err);
    // optionally: win.destroy();
  }
}

app.whenReady()
  .then(createWindow)
  .catch(err => {
    console.error('❌ app.whenReady() failed:', err);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch(err => {
      console.error('❌ createWindow on activate failed:', err);
    });
  }
});

// 2) Global catch so you never miss a rejected promise
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});
