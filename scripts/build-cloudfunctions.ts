import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(__dirname, '..');
const source = join(root, 'miniprogram/cloudfunctions');
const target = join(root, 'miniprogram/cloudfunctions-dist');
rmSync(target, { recursive: true, force: true });
execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'miniprogram/tsconfig.cloud.json')], { stdio: 'inherit' });
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dest = join(target, entry.name);
  mkdirSync(dest, { recursive: true });
  cpSync(join(source, entry.name, 'package.json'), join(dest, 'package.json'));
}
