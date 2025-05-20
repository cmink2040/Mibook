// main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import path from 'path';
import { fileURLToPath } from 'url';

// 1) Shim __dirname & __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
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


ipcMain.handle('open-file', async () => {
  // 1) Let the user pick a file:
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PDFs', extensions: ['pdf'] }]
  });
  if (canceled || filePaths.length === 0) return { count: 0 };

  // 2) If you want to *test* with your bundled test PDF, override here:
  // const filePath = path.join(__dirname, '../test/data/05-versions-space.pdf');

  //—but normally use the picked file:
  const filePath = filePaths[0];

  // 3) Read it
  try {
    const buffer = await fs.readFile(filePath);
    const { text } = await pdfParse(buffer);

    // 4) Count chapters
    const matches = text.match(/\bchapter\s+\d+/gi) || [];
    return { count: matches.length };
  } catch (err) {
    console.error('❌ open-file error:', err);
    return { count: 0, error: err.message };
  }
});