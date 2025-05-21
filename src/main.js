// main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import path from 'path';
import { fileURLToPath } from 'url';

// import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';


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
      preload: path.join(__dirname, 'preload.js'), // if you have one
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

ipcMain.handle('count-chapters', async (_evt, fileData) => {
  try {
    // 1) Convert the passed ArrayBuffer to a Uint8Array
    const uint8ArrayData = new Uint8Array(fileData);

    // 2) Load the PDF from the passed Uint8Array
    const loadingTask = pdfjsLib.getDocument({ data: uint8ArrayData });
    const pdf = await loadingTask.promise;

    // 3) Grab the outline (table of contents)
    //    This returns an array of items, each may have a `.items` array of children
    const outline = await pdf.getOutline();

    console.log('Outline:', outline);

    // 4) Count only the top-level entries
    const count = Array.isArray(outline) ? outline.length : 0;

    // 5) Always cleanup
    await pdf.destroy();

    return { count };
  } catch (err) {
    console.error('❌ count-chapters error:', err);
    return { count: -1, error: err.message };
  }
});
