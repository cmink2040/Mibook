const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  countChapters: (arrayBuffer) =>
    ipcRenderer.invoke('count-chapters', arrayBuffer)
});