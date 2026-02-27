'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');

const isDev = !app.isPackaged;
const devUrl = process.env.PMSPEC_DESKTOP_DEV_URL;
const backendPortRaw = process.env.PMSPEC_DESKTOP_BACKEND_PORT || '3000';
const backendPort = Number.parseInt(backendPortRaw, 10) || 3000;

let backendServer;
let backendStop;
let backendBaseUrl;
let isQuitting = false;
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:']);

function normalizeExternalUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    if (!allowedExternalProtocols.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    const normalizedUrl = normalizeExternalUrl(url);
    if (!normalizedUrl) {
      console.error('[desktop] Blocked external URL:', url);
      return { action: 'deny' };
    }

    shell.openExternal(normalizedUrl).catch((error) => {
      console.error('[desktop] Failed to open external URL:', error);
    });
    return { action: 'deny' };
  });

  return window;
}

function resolveBackendEntry() {
  const candidates = [
    path.resolve(__dirname, '../web/backend/dist/backend/src/server.js'),
    path.resolve(__dirname, '../web/backend/dist/server.js'),
    path.resolve(process.resourcesPath || '', 'app.asar/web/backend/dist/backend/src/server.js'),
    path.resolve(process.resourcesPath || '', 'app.asar/web/backend/dist/server.js'),
    path.resolve(process.resourcesPath || '', 'web/backend/dist/backend/src/server.js'),
    path.resolve(process.resourcesPath || '', 'web/backend/dist/server.js'),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function waitForHttpReady(url, timeoutMs = 20000, intervalMs = 300) {
  const startAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();

        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }

        if (Date.now() - startAt >= timeoutMs) {
          reject(new Error(`Service is not ready: ${url}`));
          return;
        }

        setTimeout(attempt, intervalMs);
      });

      req.on('error', () => {
        if (Date.now() - startAt >= timeoutMs) {
          reject(new Error(`Service is not reachable: ${url}`));
          return;
        }

        setTimeout(attempt, intervalMs);
      });

      req.setTimeout(1500, () => {
        req.destroy();
      });
    };

    attempt();
  });
}

async function startBackend() {
  if (backendServer) {
    return backendBaseUrl;
  }

  const entry = resolveBackendEntry();
  if (!entry) {
    throw new Error('Cannot find backend entry file (expected web/backend/dist/server.js).');
  }

  process.env.NODE_ENV = 'production';
  process.env.PORT = String(backendPort);
  process.env.HOST = '127.0.0.1';
  process.env.PMSPEC_WORKSPACE_ROOT = process.env.PMSPEC_WORKSPACE_ROOT || process.cwd();

  const backendModule = require(entry);
  if (typeof backendModule.startServer !== 'function') {
    throw new Error('Backend entry does not export startServer(port).');
  }

  backendStop = typeof backendModule.stopServer === 'function' ? backendModule.stopServer : null;
  backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  backendServer = await backendModule.startServer(backendPort);

  await waitForHttpReady(`${backendBaseUrl}/api/health`);
  return backendBaseUrl;
}

function stopBackend() {
  if (!backendServer) {
    return;
  }

  const server = backendServer;
  backendServer = undefined;

  if (backendStop) {
    backendStop(server).catch((error) => {
      if (!isQuitting) {
        console.error('[desktop] Failed to stop backend cleanly:', error);
      }
    });
    return;
  }

  server.close();
}

function registerIpcHandlers() {
  ipcMain.handle('desktop:get-app-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    backendUrl: backendBaseUrl || null,
  }));

  ipcMain.handle('desktop:open-external', async (_event, rawUrl) => {
    const normalizedUrl = normalizeExternalUrl(rawUrl);
    if (!normalizedUrl) {
      throw new Error('Blocked external URL.');
    }

    await shell.openExternal(normalizedUrl);
    return true;
  });
}

async function bootstrap() {
  const window = createMainWindow();

  if (isDev) {
    if (!devUrl) {
      throw new Error('Missing PMSPEC_DESKTOP_DEV_URL in development mode.');
    }

    await window.loadURL(devUrl);
    return;
  }

  const url = await startBackend();
  await window.loadURL(url);
}

app.whenReady()
  .then(async () => {
    registerIpcHandlers();
    await bootstrap();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await bootstrap();
      }
    });
  })
  .catch((error) => {
    console.error('[desktop] Failed to start app:', error);
    app.quit();
  });

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
