// Package an offline-ready release: release/{server.cjs, public/, config.json, README-deploy.md}.
// Run after `vite build`. The server needs only Node.js — no npm install on the target machine.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'release');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(root, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(out, 'server.cjs'),
  logLevel: 'info',
});

fs.cpSync(path.join(root, 'dist'), path.join(out, 'public'), { recursive: true });
// config.json lives next to server.cjs so admins edit one file; drop the copy Vite placed in dist.
fs.rmSync(path.join(out, 'public', 'config.json'), { force: true });
fs.copyFileSync(path.join(root, 'public', 'config.json'), path.join(out, 'config.json'));
fs.copyFileSync(path.join(root, 'docs', 'deploy.md'), path.join(out, 'README-deploy.md'));

console.log(`Release ready in ${path.relative(root, out)}/`);
