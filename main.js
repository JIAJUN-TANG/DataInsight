import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import pkg from 'electron-updater';
import log from 'electron-log';

const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (await import('electron-squirrel-startup')) {
    app.quit();
  }
} catch (error) {
  // Ignore if electron-squirrel-startup is not available
}

// Configure autoUpdater logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 修复contextBridge错误，启用contextIsolation
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'icon.png'),
  });

  // 在开发模式下使用vite服务器，生产模式下加载dist目录
  const isDev = process.env.NODE_ENV === 'development';
  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;
  
  mainWindow.loadURL(url);

  // Open the DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Check for updates when window is ready
  checkForUpdates();
};

// Auto-updater event handlers
function checkForUpdates() {
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

// Listen for update check requests from renderer process
ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

// When an update is available
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: '更新可用',
    message: `发现新版本 ${info.version}`,
    detail: '正在下载更新...',
    buttons: ['确定']
  });
});

// When an update has been downloaded
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: '更新下载完成',
    message: `版本 ${info.version} 已下载完成`,
    detail: '应用将重启并安装更新',
    buttons: ['立即重启', '稍后重启']
  }).then((result) => {
    if (result.response === 0) {
      // Restart now
      autoUpdater.quitAndInstall();
    }
  });
});

// When there's an error with the update
autoUpdater.on('error', (err) => {
  autoUpdater.logger.error('更新错误:', err.message);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// 获取应用数据目录
const appDataPath = app.getPath('userData');
const envFilePath = path.join(appDataPath, '.env');

// 读取env文件
ipcMain.handle('read-env-file', async () => {
  try {
    const data = await fs.readFile(envFilePath, 'utf8');
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回空字符串
      return '';
    }
    throw error;
  }
});

// 写入env文件
ipcMain.handle('write-env-file', async (event, data) => {
  try {
    await fs.writeFile(envFilePath, data, 'utf8');
    return true;
  } catch (error) {
    throw error;
  }
});

// 检查env文件是否存在
ipcMain.handle('check-env-file', async () => {
  try {
    await fs.access(envFilePath);
    return true;
  } catch (error) {
    return false;
  }
});
