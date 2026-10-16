import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const slots = [];
let cursor = 0;
let pendingAdvance;
let shortcuts;
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
  useMemo: (fn) => fn(),
  // These checks exercise event/state transitions, without mounting browser effects.
  useEffect() {},
};
const jsx = (type, props) => ({ type, props });
function load(relative) {
  const source = readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const mockRequire = (name) => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.endsWith('/validator')) return load('src/utils/validator.ts');
    if (name.endsWith('/typingStats')) return load('src/utils/typingStats.ts');
    if (name.endsWith('/PracticeSettingsProvider')) return { usePracticeSettings: () => ({ hintsEnabled: true, ready: true }) };
    if (name.endsWith('/useKeyboardPlatform')) return { useKeyboardPlatform: () => ({ keyLabel: (key) => key }) };
    if (name.endsWith('/usePracticeShortcuts')) return { usePracticeShortcuts(value) { shortcuts = value; } };
    return new Proxy({}, { get: (_, key) => key });
  };
  new Function('exports', 'require', 'setTimeout', 'clearTimeout', code)(
    exports, mockRequire,
    (fn) => { pendingAdvance = fn; return 1; },
    () => { pendingAdvance = undefined; },
  );
  return exports;
}

const { VocabularyModule } = load('src/components/VocabularyModule.tsx');
const words = ['cat', 'dog', 'sun'].map((name) => ({ name, trans: [name] }));
const progress = { index: 0, knownWords: [], mistakeWords: [] };
const results = [];
const props = {
  words, progress, listLabel: 'Test', pronunciationType: '1',
  onSelectIndex: (index) => { progress.index = index; },
  onCorrect: (word, index, result) => {
    results.push({ word, ...result });
    if (!result.review) progress.knownWords = [...new Set([...progress.knownWords, word])];
  },
  onMistake: (word) => { progress.mistakeWords = [...new Set([...progress.mistakeWords, word])]; },
  onSpeak() {},
};
function render() { cursor = 0; return VocabularyModule(props); }
function find(node, type) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === type) return node;
  return [node.props?.children].flat(Infinity).map((child) => find(child, type)).find(Boolean);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}
function type(value) { find(render(), 'PracticeSpellingBoard').props.onChange(value); }
function advance() { const fn = pendingAdvance; pendingAdvance = undefined; fn?.(); }

type('x');
type('cat');
advance();
render();
shortcuts.hint();
type('dog');
advance();
type('sun');
const mastery = find(render(), 'MasteryPanel');
assert.ok(mastery, '完成题库应显示掌握页面');
assert.deepEqual(progress.mistakeWords, ['cat'], '只记录实际拼错的单词');
assert.deepEqual(results, [
  { word: 'cat', perfect: false, review: false },
  { word: 'dog', perfect: false, review: false },
  { word: 'sun', perfect: true, review: false },
], '纠错或使用提示不能获得完美奖励');
mastery.props.onReview();
assert.equal(find(render(), 'PracticeSpellingBoard').props.words[0], 'cat', '复习仅包含错词');
type('cat');
assert.equal(results.at(-1).review, true, '错题复习必须向积分记录传递复习标记');
assert.match(text(render()), /错题复习完成/);
assert.deepEqual(progress.mistakeWords, ['cat'], '答对后仍保留历史错词以供再次复习');
const again = [find(render(), 'section').props.children].flat(Infinity)
  .flatMap((node) => [node, ...[node?.props?.children].flat(Infinity)])
  .find((node) => node?.type === 'Button' && text(node) === '再复习一轮');
assert.ok(again);
progress.mistakeWords = [];
again.props.onClick();
assert.match(text(render()), /暂时没有错题/);
console.log('✅ 单词错题复习：错词记录、筛选、复习完成、历史保留及无错题提示通过');
