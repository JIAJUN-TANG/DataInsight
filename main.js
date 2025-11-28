import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import pkg from 'electron-updater';
import log from 'electron-log';

const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  if (await import('electron-squirrel-startup')) {
    app.quit();
  }
} catch (error) {
}

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'icon.png'),
  });

  // 在开发模式下使用vite服务器，生产模式下加载dist目录
  // 使用 app.isPackaged 来判断应用是否被打包
  const isDev = !app.isPackaged;
  
  // 简化路径处理，使用 Electron 提供的 loadFile 方法
  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
  } else {
    // 使用 loadFile 方法，这是 Electron 推荐的加载本地文件的方式
    await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
  
  // 添加更多调试信息
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    // 检查页面是否真的渲染了内容
    mainWindow.webContents.executeJavaScript(`
      console.log('Render process loaded');
    `);
  });
  
  // 监听页面加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load URL:', validatedURL);
    console.error('Error:', errorCode, errorDescription);
    
    // 显示错误对话框给用户
    dialog.showMessageBox({
      type: 'error',
      title: '页面加载失败',
      message: `无法加载页面: ${validatedURL}`,
      detail: `错误代码: ${errorCode}\n错误描述: ${errorDescription}`,
      buttons: ['确定']
    });
  });
  
  // 监听渲染进程崩溃事件
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process crashed:', details);
    dialog.showMessageBox({
      type: 'error',
      title: '渲染进程崩溃',
      message: '应用程序渲染进程已崩溃',
      detail: `原因: ${details.reason}\n退出代码: ${details.exitCode}`,
      buttons: ['确定']
    });
  });
  
  // 监听控制台错误
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} at ${sourceId}:${line}`);
  });
  
  // 监听网络请求失败事件
  mainWindow.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Failed to load resource:', validatedURL);
    console.error('Error:', errorCode, errorDescription);
    console.error('Is main frame:', isMainFrame);
  });

  // 开发模式下打开DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
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

autoUpdater.on('error', (err) => {
  autoUpdater.logger.error('更新错误:', err.message);
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

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
