const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  apiBase: process.env.PLANNER_API_BASE || 'http://127.0.0.1:8787',
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
