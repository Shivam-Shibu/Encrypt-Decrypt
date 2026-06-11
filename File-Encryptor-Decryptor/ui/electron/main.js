// electron/main.js
// Electron Main Process — SecureCrypt
// Controls the native window, IPC bridge, and file system access

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Window Management ────────────────────────────────────────────────────────

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,           // Custom title bar
    transparent: false,
    backgroundColor: '#0d0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // Security: isolate renderer from Node.js
      nodeIntegration: false,  // Security: disable direct Node.js in renderer
      sandbox: false
    },
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/icon.ico')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Prevent window from being garbage collected
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ─── Window Controls IPC ─────────────────────────────────────────────────────

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())

// ─── File Picker IPC ─────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const stats = fs.statSync(filePath)
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    ext: path.extname(filePath).replace('.', '')
  }
})

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options?.defaultPath || 'encrypted_file.enc',
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  if (result.canceled) return null
  return result.filePath
})

// ─── File I/O IPC ────────────────────────────────────────────────────────────

ipcMain.handle('file:read', async (_, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath)
    // Return as base64 string for safe IPC transfer
    return { success: true, data: buffer.toString('base64'), size: buffer.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:write', async (_, { filePath, data }) => {
  try {
    // data is a base64-encoded string
    const buffer = Buffer.from(data, 'base64')
    fs.writeFileSync(filePath, buffer)
    return { success: true, size: buffer.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:getInfo', async (_, filePath) => {
  try {
    const stats = fs.statSync(filePath)
    return {
      success: true,
      name: path.basename(filePath),
      size: stats.size,
      ext: path.extname(filePath).replace('.', ''),
      modified: stats.mtime.toISOString()
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(path.dirname(filePath))
})

// ─── History persistence ──────────────────────────────────────────────────────

const historyPath = path.join(app.getPath('userData'), 'history.json')

ipcMain.handle('history:load', () => {
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
    }
    return []
  } catch { return [] }
})

ipcMain.handle('history:save', (_, records) => {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(records, null, 2))
    return true
  } catch { return false }
})

ipcMain.handle('history:clear', () => {
  try {
    if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath)
    return true
  } catch { return false }
})

// ─── App info ─────────────────────────────────────────────────────────────────

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPlatform', () => process.platform)
