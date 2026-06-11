// electron/preload.js
// Secure IPC Bridge — exposes safe APIs to the renderer process
// Uses contextBridge to prevent direct Node.js access from renderer (security best practice)

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Window Controls ──────────────────────────────────────────────────────
  minimize:  () => ipcRenderer.send('window-minimize'),
  maximize:  () => ipcRenderer.send('window-maximize'),
  close:     () => ipcRenderer.send('window-close'),

  // ── Dialogs ──────────────────────────────────────────────────────────────
  openFile:   (opts)    => ipcRenderer.invoke('dialog:openFile', opts),
  openFolder: ()        => ipcRenderer.invoke('dialog:openFolder'),
  saveFile:   (opts)    => ipcRenderer.invoke('dialog:saveFile', opts),

  // ── File I/O ─────────────────────────────────────────────────────────────
  readFile:   (path)           => ipcRenderer.invoke('file:read', path),
  writeFile:  (path, data)     => ipcRenderer.invoke('file:write', { filePath: path, data }),
  getFileInfo: (path)          => ipcRenderer.invoke('file:getInfo', path),
  openInExplorer: (path)       => ipcRenderer.invoke('shell:openPath', path),

  // ── History ──────────────────────────────────────────────────────────────
  loadHistory:  ()        => ipcRenderer.invoke('history:load'),
  saveHistory:  (records) => ipcRenderer.invoke('history:save', records),
  clearHistory: ()        => ipcRenderer.invoke('history:clear'),

  // ── App Info ─────────────────────────────────────────────────────────────
  getVersion:  () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
})
