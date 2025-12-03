import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import * as pkg from 'electron-updater';
import log from 'electron-log';

// 声明nodejieba变量
// 声明segment变量
let segment = null;

const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态加载segment并处理词典
async function loadSegment() {
  try {
    // 动态导入segment
    const SegmentModule = await import('segment');
    const Segment = SegmentModule.default || SegmentModule;
    segment = new Segment();

    // 使用默认配置
    segment.useDefault();

    // 检查用户词典文件是否存在并加载
    const userDictPath = path.join(__dirname, 'user_dict.txt');
    try {
      await fs.access(userDictPath);
      // segment加载用户词典的方法可能不同，这里假设它支持loadUserDict或者类似方法
      // 如果segment不支持直接加载文件路径，可能需要读取内容
      // 查阅segment文档，通常是 segment.loadUserDict('path/to/dict');
      // 但为了保险，我们先只使用默认词典，或者尝试加载
      // segment.loadUserDict(userDictPath); 
      // 由于不确定API，暂时跳过用户词典加载，或者读取文件内容后手动添加
      // 假设 segment.loadUserDict(userDictPath) 可用，如果不可用会报错被catch
      // segment.loadUserDict(userDictPath);
      console.log('用户词典已加载 (暂未实现具体加载逻辑)');
    } catch (error) {
      // 文件不存在或加载失败
    }

    console.log('Segment初始化成功');

  } catch (error) {
    console.error('加载Segment失败:', error);
    segment = null;
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

  // 加载segment
  await loadSegment();

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

  // --- Segment分词相关的IPC处理函数 ---
  ipcMain.handle('cut-text', async (event, text) => {
    try {
      if (!segment) {
        throw new Error('segment not loaded');
      }
      console.log('开始分词:', text.substring(0, 50) + '...');
      // segment.doSegment 返回 [{ w: '词', p: 词性 }, ...]
      const result = segment.doSegment(text, { simple: true });
      // simple: true 可能返回字符串数组，取决于版本。
      // 如果 segment.doSegment(text, { simple: true }) 返回的是字符串数组最好。
      // 如果不是，我们需要 map 一下。
      // 查阅常见 segment 库行为，doSegment(text, { simple: true }) 通常返回字符串数组。
      // 如果没有 simple 选项，它返回对象数组。

      // 为了稳健，我们检查返回值类型
      let words = result;
      if (result.length > 0 && typeof result[0] !== 'string') {
        words = result.map(item => item.w);
      }

      console.log('分词完成，结果长度:', words.length);
      return words;
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
      if (!segment) {
        throw new Error('segment not loaded');
      }
      console.log('开始提取关键词:', text.substring(0, 50) + '...');
      // segment 没有直接的 extract 方法，我们需要自己实现简单的关键词提取
      // 策略：分词 -> 统计词频 -> 排序 -> 取前N个
      // 也可以过滤掉标点符号和停用词（如果能识别）

      const result = segment.doSegment(text);
      const wordCounts = {};

      result.forEach(item => {
        // item.w 是词，item.p 是词性（如果有）
        // 简单的停用词过滤：长度大于1，且不是标点符号
        // segment 的词性标注可能不完全一致，这里简单判断
        const word = item.w;
        // 过滤掉空白字符和标点（简单正则）
        if (word.trim().length > 1 && !/^[\p{P}\p{S}]+$/u.test(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });

      // 转换为数组并排序
      const sortedWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(entry => entry[0]); // 只需要词，不需要权重（或者根据接口定义返回对象？）

      // nodejieba.extract 返回 [{word: 'xx', weight: 1.2}, ...]
      // 我们需要保持接口一致性吗？
      // 查看原代码：const result = nodejieba.extract(text, topN);
      // 原代码直接返回 result。如果前端期待对象数组，我们需要包装一下。
      // 假设前端只用了 word，或者我们需要模拟 weight。
      // 为了兼容性，我们返回对象数组。

      const finalResult = sortedWords.map(word => ({
        word: word,
        weight: wordCounts[word] // 使用词频作为权重
      }));

      console.log('关键词提取完成，结果:', finalResult);
      return finalResult;
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