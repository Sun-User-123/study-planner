import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(root, 'release');

await mkdir(releaseDir, { recursive: true });

await build({
  entryPoints: [path.join(root, 'server', 'index.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(releaseDir, 'server-bundle.cjs'),
  external: ['node:sqlite'],
  sourcemap: false,
  minify: false,
  legalComments: 'none',
});

await copyFile(process.execPath, path.join(releaseDir, 'node.exe'));

console.log(`server bundle written to ${path.join(releaseDir, 'server-bundle.cjs')}`);
console.log(`node runtime copied to ${path.join(releaseDir, 'node.exe')}`);
