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
const history = load('src/utils/xp-history.ts');
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
  '../data': { sentences: [{ id: 'test', words: ['cat'], english: 'cat', zh: '猫', annotations: [{ meaning: '猫' }] }] },
  '../utils/storage': { EMPTY_PROGRESS: {
    completedIds: [], mistakes: {}, xp: 0, totalCorrectWords: 0, perfectSentences: 0,
    activityByDate: {}, knownVocabulary: [], vocabularyIndex: 0, vocabularyProgress: {},
  } },
  '../utils/validator': load('src/utils/validator.ts'),
  '../utils/speech': { speakWord() {}, stopSpeech() {} },
  '../utils/vocabulary-groups': load('src/utils/vocabulary-groups.ts'),
  '../utils/practice-xp': xp,
  '../utils/xp-history': history,
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
assert.equal(game().progress.xpHistory.length, 3, '只有获得 XP 的完成才生成明细');
assert.deepEqual(game().progress.xpHistory.map((entry) => entry.amount), [15, 10, 15]);
assert.equal(game().progress.xpHistory.reduce((sum, entry) => sum + entry.amount, 0), game().progress.xp);
game().recordVocabularyCorrect('second', 'cat', 0, 2, { perfect: true, sourceLabel: '第二题库', meaning: '猫' });
assert.equal(game().progress.xpHistory[0].sourceLabel, '第二题库 · 第 2 组');
assert.equal(game().progress.xpHistory[0].meaning, '猫');
assert.equal(game().progress.xp, 55, '不同题库独立获得首次奖励');

slots.length = 0;
const sentenceSnapshot = game();
sentenceSnapshot.changeTyped('cat'); sentenceSnapshot.changeTyped('cat');
assert.equal(game().progress.xp, 15, '同一批次句子重复完成只能奖励一次');
assert.equal(game().progress.xpHistory.length, 1);
assert.equal(game().progress.xpHistory[0].kind, 'sentence');
assert.equal(game().progress.xpHistory[0].text, 'cat');
game().restartSentence(); game().changeTyped('cat');
assert.equal(game().progress.xpHistory.length, 1, '重新练习不能产生零积分记录');
slots[1] = true; // Simulate completed hydration for reset controls.
game().resetSentenceListProgress();
assert.equal(game().progress.xp, 15); assert.equal(game().progress.xpHistory.length, 1, '清空题库进度应保留累计积分与明细');
game().changeTyped('cat');
assert.equal(game().progress.xp, 30); assert.equal(game().progress.xpHistory.length, 2);
game().resetProgress(); assert.equal(game().progress.xp, 0); assert.equal(game().progress.xpHistory?.length ?? 0, 0);

slots.length = 0;
const phrase = [{ id: 'phrase', words: ['hello'], english: 'hello', zh: '你好', annotations: [{ meaning: '你好' }] }];
const phraseGame = () => { cursor = 0; return useSentenceGame(phrase, { xpSource: { kind: 'phrase', listId: 'home', label: '精选短语' } }); };
phraseGame().revealHint(); phraseGame().changeTyped('hello');
const entry = phraseGame().progress.xpHistory[0];
assert.equal(entry.amount, 10); assert.equal(entry.perfect, false); assert.equal(entry.kind, 'phrase');
assert.equal(entry.sourceLabel, '精选短语'); assert.ok(Number.isFinite(Date.parse(entry.at)));
assert.deepEqual(history.normalizeXpHistory([entry, { ...entry, amount: -10 }, { ...entry, at: 'invalid' }, { ...entry, perfect: true }, null], 10), [entry]);
assert.deepEqual(history.normalizeXpHistory([entry], 0), []);
assert.deepEqual(history.normalizeXpHistory(undefined, 999), [], '旧积分不能伪造明细');
let many = [];
for (let i = 0; i < history.XP_HISTORY_LIMIT + 3; i += 1) many = history.appendXpEntry(many, { ...entry, text: `word-${i}` });
assert.equal(many.length, history.XP_HISTORY_LIMIT); assert.equal(many[0].text, `word-${history.XP_HISTORY_LIMIT + 2}`);
assert.deepEqual(history.normalizeXpHistory(many, 99999), many);
console.log('✅ XP：统一规则、首次完成、完美奖励、重复提交和错题复习通过');
console.log('✅ XP 明细：单词 / 短语 / 句子、奖励拆分、去重、历史兼容、容量与重置通过');
