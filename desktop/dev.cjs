'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'web/frontend');
const backendDir = path.join(rootDir, 'web/backend');

const frontendUrl = process.env.PMSPEC_DESKTOP_DEV_URL || 'http://127.0.0.1:5173';
const frontendDevUrl = new URL(frontendUrl);
const frontendPort = frontendDevUrl.port || '5173';
const frontendHost = frontendDevUrl.hostname || '127.0.0.1';
const backendPort = Number.parseInt(process.env.PMSPEC_DESKTOP_BACKEND_PORT || '3000', 10) || 3000;
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const workspaceRoot = process.env.PMSPEC_WORKSPACE_ROOT || rootDir;

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const managed = new Set();
let shuttingDown = false;

function waitForHttpReady(url, timeoutMs = 30000, intervalMs = 300) {
  const startedAt = Date.now();
  const client = url.startsWith('https://') ? https : http;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = client.get(url, (res) => {
        res.resume();

        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Service is not ready: ${url}`));
          return;
        }

        setTimeout(attempt, intervalMs);
      });

      req.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Service is not reachable: ${url}`));
          return;
        }

        setTimeout(attempt, intervalMs);
      });

      req.setTimeout(1500, () => req.destroy());
    };

    attempt();
  });
}

function attachOutput(name, child) {
  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });
}

function spawnManaged(name, command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  managed.add(child);
  attachOutput(name, child);

  child.on('exit', (code, signal) => {
    managed.delete(child);
    if (shuttingDown) {
      return;
    }

    if (name === 'electron') {
      shutdown(code || 0);
      return;
    }

    console.error(`[dev] ${name} exited unexpectedly (code=${code}, signal=${signal})`);
    shutdown(code || 1);
  });

  child.on('error', (error) => {
    console.error(`[dev] Failed to start ${name}:`, error);
    shutdown(1);
  });

  return child;
}

function killChild(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }

    const done = () => resolve();
    child.once('exit', done);

    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.once('exit', done);
      return;
    }

    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }

    setTimeout(() => {
      if (child.exitCode === null) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
    }, 2000);
  });
}

async function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await Promise.all(Array.from(managed).map((child) => killChild(child)));
  process.exit(exitCode);
}

function registerSignal(signal) {
  process.on(signal, () => {
    shutdown(0);
  });
}

registerSignal('SIGINT');
registerSignal('SIGTERM');

process.on('uncaughtException', (error) => {
  console.error('[dev] uncaughtException:', error);
  shutdown(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[dev] unhandledRejection:', error);
  shutdown(1);
});

async function run() {
  spawnManaged('frontend', npmCommand, ['run', 'dev', '--', '--host', frontendHost, '--port', frontendPort], {
    cwd: frontendDir,
    env: {
      ...process.env,
      VITE_API_URL: `${backendBaseUrl}/api`,
      VITE_WS_URL: `ws://127.0.0.1:${backendPort}/ws`,
    },
  });

  spawnManaged('backend', npmCommand, ['run', 'dev'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(backendPort),
      PMSPEC_WORKSPACE_ROOT: workspaceRoot,
    },
  });

  await Promise.all([
    waitForHttpReady(frontendUrl),
    waitForHttpReady(`${backendBaseUrl}/api/health`),
  ]);

  spawnManaged('electron', npxCommand, ['electron', path.join('desktop', 'main.cjs')], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PMSPEC_DESKTOP_DEV_URL: frontendUrl,
      PMSPEC_DESKTOP_BACKEND_PORT: String(backendPort),
      PMSPEC_WORKSPACE_ROOT: workspaceRoot,
    },
  });
}

run().catch((error) => {
  console.error('[dev] startup failed:', error);
  shutdown(1);
});
