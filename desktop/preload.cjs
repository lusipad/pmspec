'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
});

contextBridge.exposeInMainWorld('pmspecDesktop', api);
