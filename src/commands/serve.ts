import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const serveCommand = new Command('serve')
  .description('Start the PMSpec Web UI server')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .option('-o, --open', 'Open browser automatically')
  .action(async (options) => {
    const port = parseInt(options.port) || 3000;
    const shouldOpen = options.open || false;

    console.log(`\n🚀 Starting PMSpec Web Server...\n`);

    // Path to backend server
    const backendPath = path.join(__dirname, '../../web/backend/src/server.ts');

    // Check if backend exists
    const fs = await import('fs/promises');
    try {
      await fs.access(backendPath);
    } catch (error) {
      console.error('❌ Error: Web backend not found.');
      console.error('   Please ensure the web/ directory is set up correctly.');
      process.exit(1);
    }

    // Start backend server
    const backendProcess = spawn(
      'npx',
      ['ts-node-dev', '--respawn', '--transpile-only', backendPath],
      {
        cwd: path.join(__dirname, '../../web/backend'),
        env: { ...process.env, PORT: port.toString() },
        stdio: 'inherit',
        shell: true,
      }
    );

    // Wait a bit for server to start
    setTimeout(() => {
      const url = `http://localhost:${port}`;

      if (shouldOpen) {
        console.log(`\n📖 Opening browser at ${url}...\n`);
        open(url).catch((err) => {
          console.error('Could not open browser:', err.message);
        });
      }

      console.log(`\n✨ PMSpec Web UI is running!`);
      console.log(`   - URL: ${url}`);
      console.log(`   - API: ${url}/api`);
      console.log(`\n   Press Ctrl+C to stop the server.\n`);
    }, 2000);

    // Handle graceful shutdown
    const cleanup = () => {
      console.log('\n\n⏹  Shutting down PMSpec Web Server...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ Server exited with code ${code}`);
        process.exit(code);
      }
    });
  });
