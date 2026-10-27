import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/utils/vocabulary-groups.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { vocabularyGroups, vocabularyGroupProgress, withVocabularyIndex } = exports;

for (const count of [0, 3, 49, 50, 51, 100, 107, 2607, 12083]) {
  const groups = vocabularyGroups(count);
  assert.equal(groups.length, Math.ceil(count / 50));
  assert.equal(groups.reduce((total, group) => total + group.count, 0), count);
  groups.forEach((group, index) => {
    assert.equal(group.start, index * 50);
    assert.equal(group.end, Math.min(count, (index + 1) * 50));
    assert.ok(group.count > 0 && group.count <= 50);
  });
}
assert.equal(vocabularyGroups(2607).at(-1).count, 7);

const words = Array.from({ length: 107 }, (_, index) => ({ name: `word-${index}`, trans: ['test'] }));
const secondGroup = words.slice(50, 100);
const legacy = { index: 75, knownWords: ['word-0', 'word-50', 'word-51'], mistakeWords: ['word-0', 'word-52', 'word-106'] };
const projected = vocabularyGroupProgress(secondGroup, legacy, 2);
assert.equal(projected.index, 25, '旧的全词库位置应映射为组内位置');
assert.deepEqual(projected.knownWords, ['word-50', 'word-51']);
assert.deepEqual(projected.mistakeWords, ['word-52'], '错词复习不能包含其他组');
assert.equal(vocabularyGroupProgress(secondGroup, { ...legacy, index: 0 }, 2).index, 2, '没有组内位置时从未掌握词开始');

const savedSecond = withVocabularyIndex(legacy, 88, 2);
const savedThird = withVocabularyIndex(savedSecond, 103, 3);
assert.equal(vocabularyGroupProgress(secondGroup, savedThird, 2).index, 38, '切换组不能覆盖其他组的位置');
assert.equal(vocabularyGroupProgress(words.slice(100), savedThird, 3).index, 3);
assert.deepEqual(savedThird.knownWords, legacy.knownWords);
assert.deepEqual(savedThird.mistakeWords, legacy.mistakeWords);
assert.equal(legacy.groupIndices, undefined, '更新不能修改原存档对象');
assert.deepEqual(vocabularyGroupProgress(secondGroup, { ...savedThird, groupIndices: { 2: 99999 } }, 2).knownWords, projected.knownWords);
console.log('✅ 单词分组：边界、尾组、旧进度兼容、组内错词与独立位置通过');
