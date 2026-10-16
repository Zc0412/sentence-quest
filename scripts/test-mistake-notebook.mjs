import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { indexedDB } from 'fake-indexeddb';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(relative, dependencies = {}) {
  const source = readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return exports;
}
const utils = load('src/utils/mistake-notebook.ts');
const { EMPTY_NOTEBOOK, wordMistake, phraseMistake, mistakeId, newMistake, recordMistake, reviewMistake, markMistake, importMistakes, clearMistakes, normalizeNotebook } = utils;
const word = wordMistake('words', '测试词库', { name: 'cat', trans: ['猫'] }, 1);
const at = '2026-10-17T09:00:00.000Z';
let state = recordMistake(EMPTY_NOTEBOOK, word, at);
state = recordMistake(state, word, at);
assert.equal(state.entries.length, 1);
assert.equal(state.entries[0].mistakeCount, 2);
const id = mistakeId(word);
state = reviewMistake(state, id, true, at);
assert.equal(state.entries[0].status, 'pending');
state = reviewMistake(state, id, true, at);
assert.equal(state.entries[0].status, 'consolidated');
const staleEntry = newMistake(word);
assert.equal(recordMistake(state, staleEntry, at).entries[0].reviewCount, 2, '练习中的旧快照不能覆盖最新复习次数');
state = recordMistake(state, word, at);
assert.equal(state.entries[0].status, 'pending');
assert.equal(state.entries[0].consecutivePerfect, 0);
state = reviewMistake(state, id, true, at);
state = reviewMistake(state, id, false, at);
assert.equal(state.entries[0].consecutivePerfect, 0, '用提示或拼错不能累积完美次数');
state = markMistake(state, id, true);
assert.equal(state.entries[0].status, 'consolidated');
assert.equal(markMistake(state, id, false).entries[0].consecutivePerfect, 0);
const other = { ...word, listId: 'other' };
state = importMistakes(state, [word, other, other]);
assert.equal(state.entries.length, 2, '同一题库去重，不同题库独立');
const legacy = state.entries.find((entry) => entry.listId === 'other');
assert.equal(legacy.lastErrorAt, null);
assert.equal(legacy.mistakeCount, 0, '旧数据不能补造错误次数和日期');
state = clearMistakes(state, 'other');
assert.equal(importMistakes(state, [other]).entries.length, 1, '已清空的历史记录不应重新导入');
assert.equal(recordMistake(state, other, at).entries.length, 2, '清空后新的错误仍可记录');
assert.deepEqual(normalizeNotebook(null), EMPTY_NOTEBOOK);
assert.equal(normalizeNotebook({ entries: [null, {}, ...state.entries, ...state.entries] }).entries.length, 1);
assert.equal(normalizeNotebook({ entries: [{ ...newMistake(word), mistakeCount: -1, lastErrorAt: 'bad' }] }).entries[0].lastErrorAt, null);

const repo = load('src/repositories/mistake-notebook.ts', { '../utils/mistake-notebook': utils });
try {
  globalThis.indexedDB = indexedDB;
  await Promise.all(Array.from({ length: 12 }, (_, index) => repo.transactNotebook((old) => recordMistake(old, { ...word, itemId: `cat-${index}` }, at))));
  assert.equal((await repo.transactNotebook()).entries.length, 12, '并发事务不丢记录');
  await repo.transactNotebook((old) => markMistake(old, old.entries[0].id, true));
  assert.equal((await repo.transactNotebook()).entries[0].status, 'consolidated', '重新打开后应保留复习状态');
  assert.deepEqual((await indexedDB.databases()).map((db) => db.name), ['sentleap-mistakes'], '错题本不能覆盖正常练习存档');
  delete globalThis.indexedDB;
  await assert.rejects(repo.transactNotebook(), /不支持/);
  globalThis.indexedDB = { open() { return {}; } };
  await assert.rejects(repo.transactNotebook(), /超时/);
} finally { delete globalThis.indexedDB; }

const sampleSentence = {
  id: 'home-phrases:a', unit: 1, category: '日常', zh: '早上好', english: 'Good morning', words: ['Good', 'morning'], note: '',
  annotations: [{ phonetic: '', meaning: '好' }, { phonetic: '', meaning: '早晨' }], grammar: [],
};
const calls = [];
const { loadLegacyMistakes } = load('src/data/legacy-mistakes.ts', {
  './vocabulary': { vocabularyLists: [{ id: 'words', label: '词库' }, { id: 'unused', label: '未用题库' }], loadVocabularyWords: async (id) => { calls.push(id); return [{ name: 'cat', trans: ['猫'] }]; } },
  './phrase-practice': { phrasePracticeLists: [{ id: 'phrases', label: '短语' }] },
  './phrase-sentences': { loadPhraseSentences: async () => { calls.push('phrases'); return [{ ...sampleSentence, id: 'phrases:a' }]; } },
  './home-phrases.json': [sampleSentence], './index': { sentences: [] },
  '../utils/mistake-notebook': utils, '../utils/vocabulary-groups': { VOCABULARY_GROUP_SIZE: 50 },
});
const progress = { vocabularyProgress: { words: { mistakeWords: ['cat'] } }, mistakes: { 'home-phrases:a': 1, 'phrases:a': 2 } };
const migrated = await loadLegacyMistakes(progress, EMPTY_NOTEBOOK);
assert.equal(migrated.items.length, 3);
assert.deepEqual(calls.sort(), ['phrases', 'words'], '只加载有未导入错题的题库');
calls.length = 0;
await loadLegacyMistakes(progress, importMistakes(EMPTY_NOTEBOOK, migrated.items));
assert.equal(calls.length, 0, '有内容快照后不重复下载题库');
assert.ok((await loadLegacyMistakes({ vocabularyProgress: { missing: { mistakeWords: ['cat'] } }, mistakes: {} }, EMPTY_NOTEBOOK)).warnings.length);

// Exercise real question events using the existing input board contract.
const validator = load('src/utils/validator.ts');
const typingStats = load('src/utils/typingStats.ts', { './validator': validator });
function harness(entry) {
  const slots = [];
  let cursor = 0, shortcuts;
  let current = { ...EMPTY_NOTEBOOK, entries: [entry] };
  const records = [], reviews = [], results = [];
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
    './MistakeNotebookProvider': { useMistakeNotebook: () => ({ state: current, record: (item) => { records.push(item); current = recordMistake(current, item, at); }, review: (id, perfect) => { reviews.push(perfect); current = reviewMistake(current, id, perfect, at); } }) },
    './LearningHistoryProvider': { useLearningHistory: () => ({ record() {} }) },
    './PracticeSettingsProvider': { usePracticeSettings: () => ({ ready: true, hintsEnabled: true }) },
    '@/hooks/usePracticeShortcuts': { usePracticeShortcuts: (value) => { shortcuts = value; } },
    '@/utils/typingStats': typingStats, '@/utils/validator': validator,
    '@/utils/speech': { speakWord() {}, stopSpeech() {} },
    '@/hooks/useKeyboardPlatform': { useKeyboardPlatform: () => ({ keyLabel: (key) => key }) },
    ...Object.fromEntries(['PracticeSpellingBoard', 'CompletionPanel', 'ProgressBar', 'ShortcutHint', 'ExercisePrompt', 'PracticeNavigation', 'TypingStatistics', 'MasteryPanel'].map((name) => [`./${name}`, { [name]: name }])),
    './ui/button': { Button: 'Button' },
  };
  const { NotebookQuestion } = load('src/components/NotebookPractice.tsx', dependencies);
  const props = { entry, onFinish: (result) => results.push(result), onNext() {}, onReplay() {}, onSkip() {} };
  function render() { cursor = 0; return NotebookQuestion(props); }
  function find(node, type) {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === type) return node;
    return [node.props?.children].flat(Infinity).map((child) => find(child, type)).find(Boolean);
  }
  return {
    render, find, records, reviews, results,
    type(value) { find(render(), 'PracticeSpellingBoard').props.onChange(value); },
    hint() { render(); shortcuts.hint(); },
  };
}
const question = harness(newMistake(word));
assert.ok(question.find(question.render(), 'ExercisePrompt'), '错词复习必须复用正常练习题目布局');
assert.ok(question.find(question.render(), 'ExercisePrompt').props.navigation.type === 'PracticeNavigation');
assert.equal(question.find(question.render(), 'ExercisePrompt').props.progressDetails.type, 'TypingStatistics');
question.type('x'); question.type(''); question.type('z'); question.type('cat');
assert.equal(question.records.length, 1, '一道题反复纠错只能计一次错误');
assert.deepEqual(question.reviews, [false]);
assert.equal(question.results.length, 1);
assert.equal(question.results[0].skipped, false);
const hinted = harness(newMistake(word));
hinted.hint(); hinted.type('cat');
assert.deepEqual(hinted.reviews, [false]);
assert.equal(hinted.records.length, 0, '只用提示不记错误');
const phrase = harness(newMistake(phraseMistake('home-phrases', '精选', sampleSentence)));
phrase.type('Good');
assert.equal(phrase.results.length, 0);
phrase.type('morning');
assert.equal(phrase.results.length, 1);
assert.deepEqual(phrase.reviews, [true]);
assert.ok(phrase.find(phrase.render(), 'CompletionPanel'), '短语答完先停留在本题完成页面');
const { normalizeReviewSession } = load('src/utils/review-session.ts');
assert.deepEqual(normalizeReviewSession({ ids: [id, id], returnHref: '/settings?tab=mistakes&mistakeKind=word' }).ids, [id]);
assert.equal(normalizeReviewSession({ ids: [], returnHref: '/settings?tab=mistakes' }), null);
assert.equal(normalizeReviewSession({ ids: [id], returnHref: 'https://example.com/' }), null);
assert.equal(normalizeReviewSession({ ids: [id], returnHref: '//example.com/' }), null);
assert.equal(normalizeReviewSession({ ids: Array.from({ length: 51 }, () => id), returnHref: '/settings?tab=mistakes' }), null);
const sessionData = new Map();
let sessionSequence = 0;
function sessionContext() {
  const jsx = (type, props) => ({ type, props });
  const { MistakeNotebookProvider } = load('src/components/MistakeNotebookProvider.tsx', {
    react: {
      createContext: () => ({ Provider: 'Provider' }), useContext() {}, useEffect() {},
      useState: (initial) => [initial, () => {}], useRef: (initial) => ({ current: initial }), useCallback: (fn) => fn,
    },
    'react/jsx-runtime': { jsx }, '@/utils/mistake-notebook': utils,
    '@/repositories/mistake-notebook': {}, '@/utils/id': { createId: () => `session-${++sessionSequence}` },
    '@/utils/review-session': { normalizeReviewSession },
  });
  return MistakeNotebookProvider({ children: null }).props.value;
}
try {
  globalThis.sessionStorage = { setItem: (key, value) => sessionData.set(key, value), getItem: (key) => sessionData.get(key) ?? null };
  const first = sessionContext();
  const token = first.createSession([id], '/settings?tab=mistakes&mistakeKind=phrase&mistakeSource=phrases');
  assert.deepEqual(first.readSession(token).ids, [id]);
  assert.equal(sessionContext().readSession(token).returnHref, '/settings?tab=mistakes&mistakeKind=phrase&mistakeSource=phrases', '刷新后保留复习队列和返回筛选');
  globalThis.sessionStorage = { setItem() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); } };
  const memory = sessionContext();
  const memoryToken = memory.createSession([id], '/settings?tab=mistakes');
  assert.deepEqual(memory.readSession(memoryToken).ids, [id], '禁用 sessionStorage 时仍可进入复习页');
  assert.equal(sessionContext().readSession('missing'), null);
} finally { delete globalThis.sessionStorage; }
console.log('✅ 错题本：记录去重、题库隔离、巩固状态、旧数据迁移、独立存档、并发与超时、单词及短语复习通过');
