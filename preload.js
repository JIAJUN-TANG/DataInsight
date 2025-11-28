const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  readEnvFile: () => ipcRenderer.invoke('read-env-file'),
  writeEnvFile: (data) => ipcRenderer.invoke('write-env-file', data),
  checkEnvFile: () => ipcRenderer.invoke('check-env-file')
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
