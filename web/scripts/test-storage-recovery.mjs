/** 模拟浏览器 IndexedDB open 永不回调、事务永不完成、被其他标签页阻塞，确保不会卡 loading。 */
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'sentleap-recovery-'));
const files = ['src/types/game.ts', 'src/repositories/progress.ts', 'src/repositories/indexeddb-progress.ts', 'src/utils/storage.ts', 'src/utils/xp-history.ts'];
for (const file of files) {
  const filename = join(root, file);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dest = join(tmp, file.replace(/\.ts$/, '.js'));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, code);
}
function reload() {
  for (const file of files) {
    const js = join(tmp, file.replace(/\.ts$/, '.js'));
    delete require.cache[require.resolve(js)];
  }
  return require(join(tmp, 'src/utils/storage.js'));
}
const legacyKey = 'sentence-quest-progress-v1';
const old = { completedIds: ['daily-001'], xp: 19, mistakes: {}, totalCorrectWords: 3, perfectSentences: 0 };
const local = new Map([[legacyKey, JSON.stringify(old)]]);
globalThis.window = { localStorage: {
  getItem: (key) => local.get(key) ?? null,
  setItem: (key, value) => local.set(key, value),
  removeItem: (key) => local.delete(key),
} };
try {
  // 1. open() 返回的 request 从不触发任一事件（旧版本会无限等待）。
  globalThis.indexedDB = { open() { return {}; } };
  let storage = reload();
  let start = Date.now();
  let result = await storage.loadProgress();
  let elapsed = Date.now() - start;
  assert.equal(result.persistence, 'memory');
  assert.equal(result.progress.xp, 19);
  assert.match(result.warning, /超时/);
  assert.ok(elapsed < 7000, `打开超时没有生效：${elapsed}ms`);
  assert.equal(local.has(legacyKey), true);

  // 2. 升级被其他标签页挡住，不等待，也不清除原有数据。
  globalThis.indexedDB = { open() {
    const request = {};
    queueMicrotask(() => request.onblocked?.());
    return request;
  } };
  storage = reload();
  start = Date.now();
  result = await storage.loadProgress();
  elapsed = Date.now() - start;
  assert.equal(result.persistence, 'memory');
  assert.match(result.warning, /其他标签页/);
  assert.ok(elapsed < 1000, `阻塞事件应立即返回：${elapsed}ms`);
  assert.equal(local.has(legacyKey), true);

  // 3. open 成功，但 get() 事务永远不触发 complete/error。
  globalThis.indexedDB = { open(name) {
    if (name === 'sentence-quest') {
      const request = { result: { objectStoreNames: { contains: () => false }, close() {} } };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    }
    const db = {
      objectStoreNames: { contains: () => true },
      close() {},
      transaction() { return { objectStore() { return { get() { return {}; } }; }, abort() {} }; },
    };
    const request = { result: db };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  } };
  storage = reload();
  start = Date.now();
  result = await storage.loadProgress();
  elapsed = Date.now() - start;
  assert.equal(result.persistence, 'memory');
  assert.match(result.warning, /超时/);
  assert.ok(elapsed < 7000, `事务超时没有生效：${elapsed}ms`);
  assert.equal(local.has(legacyKey), true);
  console.log('✅ 异常恢复测试通过：IndexedDB 打开挂起 / 升级阻塞 / 读取事务挂起；均停止 loading，旧存档仍保留');
} finally {
  rmSync(tmp, { recursive: true, force: true });
  delete globalThis.window;
  delete globalThis.indexedDB;
}
