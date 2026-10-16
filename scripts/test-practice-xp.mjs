import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(relative, dependencies = {}) {
  const source = readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, (name) => {
    assert.ok(name in dependencies, `Unexpected import: ${name}`);
    return dependencies[name];
  });
  return exports;
}

const xp = load('src/utils/practice-xp.ts');
assert.equal(xp.practiceXp(true, true), 15);
assert.equal(xp.practiceXp(true, false), 10);
assert.equal(xp.practiceXp(false, true), 0);
assert.equal(xp.practiceXp(false, false), 0);

// Exercise the actual game hook's functional progress updates, without browser effects.
const slots = [];
let cursor = 0;
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useEffect() {},
};
const { useSentenceGame } = load('src/hooks/useSentenceGame.ts', {
  react,
  '../data': { sentences: [{ id: 'test', words: ['cat'] }] },
  '../utils/storage': { EMPTY_PROGRESS: {
    completedIds: [], mistakes: {}, xp: 0, totalCorrectWords: 0, perfectSentences: 0,
    activityByDate: {}, knownVocabulary: [], vocabularyIndex: 0, vocabularyProgress: {},
  } },
  '../utils/validator': {},
  '../utils/speech': {},
  '../utils/vocabulary-groups': load('src/utils/vocabulary-groups.ts'),
  '../utils/practice-xp': xp,
});
function game() { cursor = 0; return useSentenceGame(); }
game().recordVocabularyCorrect('test', 'cat', 0, 1, { perfect: true });
assert.equal(game().progress.xp, 15);
game().recordVocabularyCorrect('test', 'cat', 0, 1, { perfect: true });
assert.equal(game().progress.xp, 15, '重复练习不能重复获得 XP');
game().recordVocabularyCorrect('test', 'dog', 1, 1, { perfect: false });
assert.equal(game().progress.xp, 25, '有纠错或提示时仅获得基础奖励');
game().recordVocabularyCorrect('test', 'sun', 2, 1, { perfect: true, review: true });
assert.equal(game().progress.xp, 25, '错题复习不能增加 XP');
assert.ok(!game().progress.vocabularyProgress.test.knownWords.includes('sun'), '复习不应消耗未掌握词的首次完成奖励');
const snapshot = game();
snapshot.recordVocabularyCorrect('test', 'sun', 2, 1, { perfect: true });
snapshot.recordVocabularyCorrect('test', 'sun', 2, 1, { perfect: true });
assert.equal(game().progress.xp, 40, '同一批次重复提交也只能奖励一次');
assert.deepEqual(game().progress.vocabularyProgress.test.groupIndices, { 1: 2 });
assert.equal(game().progress.completedIds.length, 0, '单词奖励不应修改短语完成记录');
console.log('✅ XP：统一规则、首次完成、完美奖励、重复提交和错题复习通过');
