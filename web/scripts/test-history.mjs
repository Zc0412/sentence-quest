import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { indexedDB } from 'fake-indexeddb';

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), 'sentleap-history-'));
for (const file of ['src/types/learning-history.ts', 'src/utils/learning-history.ts', 'src/repositories/learning-history.ts']) {
  const output = join(tmp, file.replace(/\.ts$/, '.js'));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
const { EMPTY_HISTORY, HISTORY_LIMIT, recordLearning, normalizeHistory } = require(join(tmp, 'src/utils/learning-history.js'));
const { transactHistory } = require(join(tmp, 'src/repositories/learning-history.js'));
const entry = (id) => ({ id, text: 'Apple', kind: 'word', meaning: '苹果', at: '2026-10-20T09:00:00.000Z', day: '2026-10-20' });
try {
  const first = recordLearning(EMPTY_HISTORY, entry('a'));
  assert.equal(recordLearning(first, entry('a')).entries.length, 1);
  assert.equal(recordLearning(first, entry('b')).entries.length, 2, 'repeated practice leaves a separate trace');
  const full = { version: 1, entries: Array.from({ length: HISTORY_LIMIT }, (_, i) => entry(String(i))) };
  assert.equal(recordLearning(full, entry('new')).entries.length, HISTORY_LIMIT);
  assert.deepEqual(normalizeHistory(undefined), EMPTY_HISTORY);
  assert.equal(normalizeHistory({ version: 1, entries: [null, entry('a')], plans: [{ id: 'legacy' }] }).entries.length, 1);
  globalThis.indexedDB = indexedDB;
  // Seed an old-format record: reward data must neither be evaluated nor deleted.
  await transactHistory();
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('sentleap-rewards', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('state', 'readwrite');
      tx.objectStore('state').put({ version: 1, entries: [entry('legacy')], plans: [{ id: 'old-plan', count: 7 }] }, 'guest');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = reject;
    };
  });
  await Promise.all(Array.from({ length: 8 }, (_, i) => transactHistory((old) => recordLearning(old, entry(`concurrent-${i}`)))));
  assert.equal((await transactHistory()).entries.length, 9, 'concurrent transactions retain all traces including legacy data');
  const raw = await new Promise((resolve) => {
    const request = indexedDB.open('sentleap-rewards', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('state');
      const read = tx.objectStore('state').get('guest');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
    };
  });
  assert.deepEqual(raw.plans, [{ id: 'old-plan', count: 7 }]);
  delete globalThis.indexedDB;
  await assert.rejects(transactHistory(), /不支持/);
  globalThis.indexedDB = { open() { return {}; } };
  await assert.rejects(transactHistory(), /超时/);
  console.log('✅ Learning history: dedupe, bounded traces, legacy data preservation, concurrent persistence, reopen and timeout');
} finally {
  delete globalThis.indexedDB;
  rmSync(tmp, { recursive: true, force: true });
}
