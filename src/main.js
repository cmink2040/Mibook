// main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import path from 'path';
import { fileURLToPath } from 'url';


import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';


// import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import generateContent from './llm.js';

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

ipcMain.handle('split-chapters', async (_evt, fileData) => {
  try {
    // 1) Load with pdfjs to get the outline
    const uint8 = new Uint8Array(fileData);
    console.log(uint8.subarray(0, 5));  


    const pdfjsData = new Uint8Array(uint8);
    const loadingTask = pdfjsLib.getDocument({ data: pdfjsData });
    const pdf = await loadingTask.promise;
    let outline = await pdf.getOutline();



// If no valid outline, reconstruct it
    if (!Array.isArray(outline) || outline.length === 0) {
      const reconstructedOutline = [];
      const chapterRegex = /chapter\s+\d+/i;
      // Match standalone Roman numerals anywhere in text
      const romanNumeralRegex = /\b(i{1,3}|iv|v|vi{0,3}|ix|x)\b/i;
    
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const normalizedText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ');
      
        const chapterMatch = chapterRegex.exec(normalizedText);
        const romanMatch   = romanNumeralRegex.exec(normalizedText);
      
        if (chapterMatch || romanMatch) {
          const title  = chapterMatch ? chapterMatch[0] : romanMatch[0];
          const destRef = page.ref;  // PDFPageProxy.ref is the same ref objects getOutline uses
      
          reconstructedOutline.push({
            title,
            dest:           [ destRef ],  // ← exactly like pdf.getOutline() entries
            url:            null,
            unsafeUrl:      undefined,
            newWindow:      undefined,
            setOCGState:    undefined,
            items:          []            // no children
          });
        }
      }

      if (reconstructedOutline.length === 0) {
        console.error('❌ No chapters found in the PDF.');
        await pdf.destroy();
        return null;
      }

      // Replace original outline with the reconstructed one
      outline = reconstructedOutline;

      console.log(outline);
    }

    else {
      console.log('Outline:', outline);
    }

    // 2) Resolve each top‐level entry to a page index
    const entries = [];
    for (const item of outline) {
      const title = item.title || 'Untitled';
      let dest = item.dest;
      if (typeof dest === 'string') {
        dest = await pdf.getDestination(dest);
      }
      if (!Array.isArray(dest)) continue;
      const [ref] = dest;
      const pageIndex = await pdf.getPageIndex(ref);
      entries.push({ title, pageIndex });
    }
    // sort by page
    entries.sort((a, b) => a.pageIndex - b.pageIndex);

    // 3) Load original into pdf-lib
    // const originalDoc = await PDFDocument.load(uint8);

    // const uint8 = new Uint8Array(fileData);
    // const loadingTask = pdfjsLib.getDocument({ data: uint8 });

    const originalDoc = await PDFDocument.load(uint8);
    const zip = new JSZip();

    for (let i = 0; i < entries.length; i++) {
      const { title, pageIndex } = entries[i];
      const nextPage = i + 1 < entries.length
        ? entries[i + 1].pageIndex
        : pdf.numPages; // until the end

      // copy pages [pageIndex .. nextPage-1]
      const newDoc = await PDFDocument.create();
      const pagesToCopy = [];
      for (let p = pageIndex; p < nextPage; p++) {
        pagesToCopy.push(p);
      }
      const copied = await newDoc.copyPages(originalDoc, pagesToCopy);
      copied.forEach(pg => newDoc.addPage(pg));

      const pdfBytes = await newDoc.save();
      const safeTitle = title
        .replace(/[<>:"/\\|?*]+/g, '')    // strip illegal chars
        .slice(0, 50);                    // limit length

      zip.file(`C${i + 1} ${safeTitle}.pdf`, pdfBytes);
    }

    await pdf.destroy();

    // 4) Generate zip as a Buffer and return
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return zipBuffer;
  } catch (err) {
    console.error('❌ split-chapters error:', err);
    // throw so renderer sees an error
    throw err;
  }
});

ipcMain.handle('invoke-ai', async (_evt, { prompt }) => {

  try {
    const response = await generateContent(prompt);
    return response;
  } catch (err) {
    console.error('❌ invoke-ai error:', err);
    return { error: err.message };
  }
});