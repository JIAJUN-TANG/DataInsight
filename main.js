import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import * as pkg from 'electron-updater';
import log from 'electron-log';

// 声明nodejieba变量
let nodejieba = null;

const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态加载nodejieba并处理词典文件
async function loadJieba() {
  try {
    // 动态导入nodejieba
    const jiebaModule = await import('nodejieba');
    nodejieba = jiebaModule.default || jiebaModule;
    
    // 检查用户词典文件是否存在
    const userDictPath = path.join(__dirname, 'user_dict.txt');
    let loadOptions = {};
    
    try {
      // 检查文件是否存在
      await fs.access(userDictPath);
      loadOptions.userDict = userDictPath;
    } catch (error) {
      // 文件不存在，不加载用户词典
    }
    
    // 初始化jieba（不指定用户词典，避免崩溃）
    nodejieba.load(loadOptions);
    console.log('Jieba初始化成功');
    
  } catch (error) {
    console.error('加载Jieba失败:', error);
    nodejieba = null;
  }
}

// 将顶层await包装在async函数中
async function initializeApp() {
  try {
    const squirrelStartup = await import('electron-squirrel-startup');
    if (squirrelStartup.default) {
      app.quit();
      return;
    }
  } catch (error) {
  }

  // 加载jieba
  await loadJieba();

  // 确保autoUpdater存在再设置logger
  if (autoUpdater) {
    autoUpdater.logger = log;
    if (autoUpdater.logger && autoUpdater.logger.transports && autoUpdater.logger.transports.file) {
      autoUpdater.logger.transports.file.level = 'info';
    }
  }

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
    const isDev = !app.isPackaged;
    
    if (isDev) {
      await mainWindow.loadURL('http://localhost:3000');
    } else {
      await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
    
    // 添加更多调试信息
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');
      mainWindow.webContents.executeJavaScript(`
        console.log('Render process loaded');
      `);
    });
    
    // 监听页面加载失败事件
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load URL:', validatedURL);
      console.error('Error:', errorCode, errorDescription);
      
      dialog.showMessageBox({
        type: 'error',
        title: '页面加载失败',
        message: `无法加载页面: ${validatedURL}`,
        detail: `错误代码: ${errorCode}\n错误描述: ${errorDescription}`,
        buttons: ['确定']
      });
    });
    
    // 开发模式下打开DevTools
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    
    checkForUpdates();
  };

  // Auto-updater event handlers
  function checkForUpdates() {
    if (autoUpdater) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }

  // --- Jieba分词相关的IPC处理函数 ---
  ipcMain.handle('cut-text', async (event, text) => {
    try {
      if (!nodejieba) {
        throw new Error('nodejieba not loaded');
      }
      console.log('开始分词:', text.substring(0, 50) + '...');
      const result = nodejieba.cut(text, true);
      console.log('分词完成，结果长度:', result.length);
      return result;
    } catch (error) {
      console.error('分词失败:', error);
      // 降级使用简单分词
      return text
        .split(/([\s\p{P}\p{S}]+|(?<=\p{Script=Han})(?=\p{Script=Latin})|(?<=\p{Script=Latin})(?=\p{Script=Han})|(?<=\d)(?=\D)|(?=\d)(?<=\D))/u)
        .filter(token => token.trim() !== '');
    }
  });

  ipcMain.handle('extract-keywords', async (event, text, topN = 5) => {
    try {
      if (!nodejieba) {
        throw new Error('nodejieba not loaded');
      }
      console.log('开始提取关键词:', text.substring(0, 50) + '...');
      const result = nodejieba.extract(text, topN);
      console.log('关键词提取完成，结果:', result);
      return result;
    } catch (error) {
      console.error('提取关键词失败:', error);
      return [];
    }
  });

  // --- 原有IPC处理函数 ---
  ipcMain.on('check-for-updates', () => {
    checkForUpdates();
  });

  // 检查更新时显示提示
  if (autoUpdater) {
    autoUpdater.on('checking-for-update', () => {
      dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message: '正在检查更新...',
        buttons: ['确定']
      });
    });

    // 发现可用更新时显示提示
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: '更新可用',
        message: `发现新版本 ${info.version}`,
        detail: '正在下载更新...',
        buttons: ['确定']
      });
    });

    // 没有可用更新时显示提示
    autoUpdater.on('update-not-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        buttons: ['确定']
      });
    });

    // 下载完成时显示提示
    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: '更新下载完成',
        message: `版本 ${info.version} 已下载完成`,
        detail: '应用将重启并安装更新',
        buttons: ['立即重启', '稍后重启']
      }).then((result) => {
        if (result.response === 0 && autoUpdater) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', (err) => {
      if (autoUpdater.logger) {
        autoUpdater.logger.error('更新错误:', err.message);
      }
      dialog.showMessageBox({
        type: 'error',
        title: '更新错误',
        message: '检查更新时发生错误',
        detail: err.message,
        buttons: ['确定']
      });
    });
  }

  // 获取当前工作目录
  const currentDirPath = process.cwd();
  const envFilePath = path.join(currentDirPath, '.env');
  console.log('Configuration file path:', envFilePath);

  // 读取env文件
  ipcMain.handle('read-env-file', async () => {
    try {
      const data = await fs.readFile(envFilePath, 'utf8');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
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

  // --- App事件监听 ---
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
}

// 启动应用
initializeApp();