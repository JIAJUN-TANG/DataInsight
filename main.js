const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Configure autoUpdater logging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.png'),
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
  
  // Check for updates when window is ready
  checkForUpdates();
};

// Auto-updater event handlers
function checkForUpdates() {
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

// Listen for update check requests from renderer process
const { ipcMain } = require('electron');
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
