const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  countChapters: (arrayBuffer) =>
    ipcRenderer.invoke('count-chapters', arrayBuffer),
  splitAndDownload: async (fileArrayBuffer) => {

    console.log("Splitting chapters...");
    try {
      // invoke the split
      const zipBuffer = await ipcRenderer.invoke('split-chapters', fileArrayBuffer);

      // create and return a blob
      return new Blob([zipBuffer], { type: 'application/zip' });
    } catch (err) {
      console.error('Failed to split chapters:', err);
      throw new Error('Error splitting chapters: ' + err.message);
    }
  },
  invokeAI: (prompt) => 
    ipcRenderer.invoke('invoke-ai', { prompt })
});
