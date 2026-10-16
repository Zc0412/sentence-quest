import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/utils/id.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function load(crypto, includeCrypto = true) {
  const exports = {};
  runInNewContext(code, { exports, ...(includeCrypto ? { crypto } : {}) });
  return exports.createId;
}
const nativeId = '12345678-1234-4234-8234-123456789abc';
assert.equal(load({ randomUUID: () => nativeId })(), nativeId);
for (const createId of [
  load({ getRandomValues: webcrypto.getRandomValues.bind(webcrypto) }),
  load({ randomUUID: undefined, getRandomValues: (bytes) => bytes.fill(255) }),
  load({}),
  load(undefined),
  load(undefined, false),
]) assert.match(createId(), uuid, 'all paths produce UUID v4 compatible with feedback API validation');
for (const crypto of [{ getRandomValues: webcrypto.getRandomValues.bind(webcrypto) }, undefined]) {
  const createId = load(crypto);
  const ids = Array.from({ length: 10000 }, () => createId());
  assert.equal(new Set(ids).size, ids.length);
}
console.log('✅ Record IDs: native UUID, HTTP getRandomValues fallback, missing crypto fallback, UUID v4 format and uniqueness');
