'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const desktopAppCandidates = [
  path.join(rootDir, 'release/win-unpacked/PMSpec.exe'),
  path.join(rootDir, 'release/win-unpacked/pmspec.exe'),
];
const requestTimeoutMs = 2000;
const readinessTimeoutMs = 30000;

function resolveDesktopApp() {
  for (const candidate of desktopAppCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Desktop smoke test failed: unpacked desktop app not found. Run `npm run desktop:package` first.');
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Cannot allocate test port.'));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(requestTimeoutMs, () => {
      req.destroy(new Error(`Request timeout: ${url}`));
    });
  });
}

async function waitFor(url, validator, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await request(url);
      if (validator(response)) {
        return response;
      }
    } catch {
      // Service may still be starting, retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Timeout waiting for ${url}`);
}

function killProcessTree(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }

    const done = () => resolve();
    child.once('exit', done);

    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      });
      killer.once('exit', done);
      return;
    }

    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 2000);
  });
}

async function run() {
  const desktopApp = resolveDesktopApp();
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const desktopProcess = spawn(desktopApp, [], {
    cwd: rootDir,
    env: {
      ...process.env,
      PMSPEC_DESKTOP_BACKEND_PORT: String(port),
      PMSPEC_WORKSPACE_ROOT: process.env.PMSPEC_WORKSPACE_ROOT || rootDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  desktopProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[desktop-smoke:app] ${chunk}`);
  });
  desktopProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[desktop-smoke:app] ${chunk}`);
  });

  try {
    await waitFor(
      `${baseUrl}/api/health`,
      (response) => response.statusCode === 200 && response.body.includes('"status":"ok"'),
      readinessTimeoutMs
    );
    await waitFor(
      baseUrl,
      (response) =>
        response.statusCode === 200 &&
        response.body.toLowerCase().includes('<!doctype html'),
      readinessTimeoutMs
    );
    console.log('[desktop-smoke] PASS /api/health and / are reachable.');
  } finally {
    await killProcessTree(desktopProcess);
  }
}

run().catch((error) => {
  console.error('[desktop-smoke] FAIL:', error.message);
  process.exit(1);
});
