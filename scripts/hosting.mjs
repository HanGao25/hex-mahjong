import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = new URL('../.local/hosting.json', import.meta.url);
const runtime = new URL('../apps/web/dist/config.json', import.meta.url);
const cli = process.env.npm_execpath;
const mode = process.argv[2];
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(Error(`${command} failed (${code})`)));
  });
}
function pnpm(...args) {
  if (!cli) throw Error('Run this script through pnpm.');
  return run(process.execPath, [cli, ...args]);
}
async function settings() {
  try { return JSON.parse(await readFile(local, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Adopt the address used during initial manual setup.
    const value = JSON.parse((await readFile(runtime, 'utf8')).replace(/^\uFEFF/, ''));
    return { publicUrl: value.serverUrl };
  }
}
function validate(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw Error('Use an HTTPS origin without a path, query, or credentials.');
  return url.origin;
}
async function save(publicUrl) {
  await mkdir(new URL('../.local/', import.meta.url), { recursive: true });
  await writeFile(local, JSON.stringify({ publicUrl }, null, 2) + '\n');
}
async function configure(publicUrl) {
  await writeFile(runtime, JSON.stringify({ serverUrl: publicUrl }, null, 2) + '\n');
}
async function requireStopped() {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', error => reject(error.code === 'EADDRINUSE'
      ? Error('Port 2567 is busy. Stop the game server with Ctrl+C first; leave the tunnel running.')
      : error));
    probe.listen(2567, () => probe.close(resolve));
  });
}
async function clean() {
  const { execFileSync } = await import('node:child_process');
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (status.trim()) throw Error('Commit or move local source changes before continuing. No changes were discarded.');
}
try {
  if (mode === 'release') {
    await clean();
    await pnpm('install', '--frozen-lockfile');
    await pnpm('build');
    await pnpm('typecheck');
    await pnpm('test');
    await pnpm('build:static');
    await run('git', ['push', 'origin', 'HEAD:main']);
    console.log('Source pushed. Upload the complete ../hex-mahjong-play folder to the physics website (and games.html if changed).');
  } else if (mode === 'host' || mode === 'update') {
    const publicUrl = validate(process.argv[3] ?? (await settings()).publicUrl);
    await requireStopped();
    await save(publicUrl);
    if (mode === 'update') {
      await clean();
      await run('git', ['pull', '--ff-only', 'origin', 'main']);
      await pnpm('install', '--frozen-lockfile');
      await pnpm('build');
      await pnpm('typecheck');
      await pnpm('test');
    }
    await configure(publicUrl);
    console.log(`Hosting at ${publicUrl}\nLeave this window and the tunnel open. Ctrl+C stops the game server.`);
    await run(process.execPath, ['apps/server/dist/index.js'], {
      env: { ...process.env, PORT: '2567', WEB_ORIGINS: `http://localhost:2567,http://127.0.0.1:2567,${publicUrl}` },
    });
  } else throw Error('Expected host, update, or release.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
