/**
 * 不安装额外依赖的 IndexedDB 存档单测。
 * mock 只用于验证仓储流程、旧版迁移与写入顺序；浏览器兼容性仍需本机实际测试。
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'sentleap-test-'));
const files = [
  'src/types/game.ts',
  'src/repositories/progress.ts',
  'src/repositories/indexeddb-progress.ts',
  'src/utils/storage.ts',
];
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

function createMockIndexedDB() {
  const records = new Map();
  const legacyRecords = new Map();
  let legacyHasStore = false;
  const createDatabase = (databaseRecords, hasStore = true) => ({
    objectStoreNames: { contains: (name) => hasStore && name === 'progress' },
    createObjectStore() { return {}; },
    close() {},
    transaction() {
      const transaction = {
        pending: 0,
        objectStore() {
          function request(action) {
            const req = { result: undefined, onsuccess: null };
            transaction.pending += 1;
            queueMicrotask(() => {
              req.result = action();
              req.onsuccess?.();
              transaction.pending -= 1;
              if (transaction.pending === 0) {
                queueMicrotask(() => { if (!transaction.pending) transaction.oncomplete?.(); });
              }
            });
            return req;
          }
          return {
            get: (key) => request(() => databaseRecords.get(key)),
            getAll: () => request(() => [...databaseRecords.values()]),
            put: (record) => request(() => { databaseRecords.set(record.profileId, structuredClone(record)); }),
          };
        },
      };
      return transaction;
    },
  });
  const database = createDatabase(records);
  return {
    records,
    legacyRecords,
    setLegacyHasStore: (value) => { legacyHasStore = value; },
    open(name) {
      const result = name === 'sentence-quest'
        ? createDatabase(legacyRecords, legacyHasStore)
        : database;
      const req = { result, onsuccess: null, onupgradeneeded: null, onerror: null };
      queueMicrotask(() => {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
}

try {
  const legacyKey = 'sentence-quest-progress-v1';
  const local = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => local.get(key) ?? null,
    setItem: (key, value) => local.set(key, value),
    removeItem: (key) => local.delete(key),
  } };
  globalThis.indexedDB = createMockIndexedDB();
  const { loadProgress, saveProgress, normalizeProgress } = require(join(tmp, 'src/utils/storage.js'));

  assert.deepEqual(normalizeProgress({ completedIds: ['one', 'one'], xp: -9, mistakes: { two: 2.7 } }), {
    completedIds: ['one'], xp: 0, mistakes: { two: 2 }, totalCorrectWords: 0, perfectSentences: 0,
    activityByDate: {}, knownVocabulary: [], vocabularyIndex: 0, vocabularyProgress: {},
  });
  assert.deepEqual(normalizeProgress({
    activityByDate: {
      '2026-10-14': { words: 3.9, sentences: 1 },
      invalid: { words: 99, sentences: 99 },
      '2026-10-13': { words: -1, sentences: 'bad' },
    },
  }).activityByDate, {
    '2026-10-14': { words: 3, sentences: 1 },
    '2026-10-13': { words: 0, sentences: 0 },
  });
  assert.deepEqual(normalizeProgress({
    knownVocabulary: ['cancel', 'cancel', ''],
    vocabularyIndex: 18.9,
  }).knownVocabulary, ['cancel']);
  assert.equal(normalizeProgress({ vocabularyIndex: 18.9 }).vocabularyIndex, 18);
  assert.deepEqual(normalizeProgress({ knownVocabulary: ['cancel'], vocabularyIndex: 18.9 }).vocabularyProgress.CET4_T, {
    knownWords: ['cancel'],
    index: 18,
  });
  assert.deepEqual(normalizeProgress({
    vocabularyProgress: {
      CET4_T: { knownWords: ['cancel', 'cancel'], index: 5.8 },
      CET6_T: { knownWords: ['cancel'], index: -1 },
      invalid: 'bad',
    },
  }).vocabularyProgress, {
    CET4_T: { knownWords: ['cancel'], index: 5 },
    CET6_T: { knownWords: ['cancel'], index: 0 },
  });
  local.set(legacyKey, JSON.stringify({ completedIds: ['daily-001'], xp: 27, mistakes: { 'daily-002': 2 }, totalCorrectWords: 3, perfectSentences: 1 }));
  let result = await loadProgress();
  assert.equal(result.migrated, true);
  assert.equal(result.persistence, 'indexeddb');
  assert.equal(result.progress.xp, 27);
  assert.equal(local.has(legacyKey), false, '旧数据应在 IndexedDB 提交成功后移除');
  result = await loadProgress();
  assert.equal(result.progress.xp, 27);
  assert.equal(result.migrated, false);

  const renamedDatabase = createMockIndexedDB();
  renamedDatabase.setLegacyHasStore(true);
  renamedDatabase.legacyRecords.set('guest', {
    profileId: 'guest',
    schemaVersion: 1,
    revision: 6,
    updatedAt: '2026-10-15T00:00:00.000Z',
    progress: { ...result.progress, xp: 83 },
  });
  globalThis.indexedDB = renamedDatabase;
  delete require.cache[require.resolve(join(tmp, 'src/repositories/indexeddb-progress.js'))];
  delete require.cache[require.resolve(join(tmp, 'src/utils/storage.js'))];
  const renamedStorage = require(join(tmp, 'src/utils/storage.js'));
  result = await renamedStorage.loadProgress();
  assert.equal(result.persistence, 'indexeddb');
  assert.equal(result.progress.xp, 83, '改名后应从旧 IndexedDB 读取学习进度');
  assert.equal(renamedDatabase.records.get('guest').revision, 6, '迁移应保留旧记录版本');
  assert.equal(renamedDatabase.legacyRecords.get('guest').progress.xp, 83, '迁移后旧数据库应继续保留原记录');

  const snapshot = { ...result.progress, xp: 60, completedIds: ['daily-001', 'daily-002'] };
  await Promise.all([
    renamedStorage.saveProgress({ ...snapshot, xp: 40 }),
    renamedStorage.saveProgress({ ...snapshot, xp: 50 }),
    renamedStorage.saveProgress(snapshot),
  ]);
  result = await renamedStorage.loadProgress();
  assert.equal(result.progress.xp, 60, '连续写入后应保留最后一次修改');
  const saved = renamedDatabase.records.get('guest');
  assert.ok(saved.revision >= 4);
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.profileId, 'guest');
  assert.ok(saved.updatedAt);

  // 禁用 IndexedDB：不得把迁移源删除，也不能谎称已经持久化。
  local.set(legacyKey, JSON.stringify({ ...snapshot, xp: 73 }));
  delete globalThis.indexedDB;
  delete require.cache[require.resolve(join(tmp, 'src/repositories/indexeddb-progress.js'))];
  delete require.cache[require.resolve(join(tmp, 'src/utils/storage.js'))];
  const freshStorage = require(join(tmp, 'src/utils/storage.js'));
  const fallback = await freshStorage.loadProgress();
  assert.equal(fallback.persistence, 'memory');
  assert.equal(fallback.progress.xp, 73);
  assert.equal(local.has(legacyKey), true);

  console.log('✅ IndexedDB 仓储模拟测试通过：旧数据迁移 / 重复读取 / 顺序写入 / 版本信息 / 数据清洗 / 不可用降级');
} finally {
  rmSync(tmp, { recursive: true, force: true });
  delete globalThis.window;
  delete globalThis.indexedDB;
}
