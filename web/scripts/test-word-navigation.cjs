const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function compile(file, requireModule) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(requireModule, module, module.exports);
  return module.exports;
}

// Exercise the hook's transitions without browser storage or audio side effects.
const states = [];
let cursor = 0;
const spoken = [];
const sentence = { id: 'test', words: ['I', 'like', 'green', 'apples'], english: 'I like green apples.' };
const empty = { completedIds: [], mistakes: {}, activityByDate: {}, xp: 0, totalCorrectWords: 0, perfectSentences: 0 };
const validator = compile('src/utils/validator.ts', require);
const { useSentenceGame } = compile('src/hooks/useSentenceGame.ts', (name) => {
  if (name === 'react') return {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef: (value) => ({ current: value }),
    useEffect() {},
  };
  if (name === '../data') return { sentences: [sentence] };
  if (name === '../utils/storage') return { EMPTY_PROGRESS: empty };
  if (name === '../utils/validator') return validator;
  if (name === '../utils/speech') return { speakWord: (word) => spoken.push(word), stopSpeech() {} };
  if (name === '../utils/practice-xp') return compile('src/utils/practice-xp.ts', require);
  if (name === '../utils/xp-history') return compile('src/utils/xp-history.ts', require);
  if (name === '../utils/vocabulary-groups') return compile('src/utils/vocabulary-groups.ts', require);
  throw Error(`Unexpected import: ${name}`);
});
const render = () => { cursor = 0; return useSentenceGame([sentence], { readWholeOnCompletion: true }); };
let game = render();
game.changeTyped('I');
game = render();
assert.equal(game.wordIndex, 1);
game.changeTyped('li');
game = render();
game.revealHint();
game = render();
assert.equal(game.revealedLetters, 3);
game.selectWord(3);
game = render();
assert.equal(game.wordIndex, 3);
game.changeTyped('apples');
game = render();
assert.equal(game.phase, 'playing', 'last position must not complete an unfinished sentence');
assert.deepEqual(game.completedWordIndices, [0, 3]);
assert.equal(game.wordIndex, 1, 'automatic navigation wraps to the first unfinished word');
assert.equal(game.typed, 'li');
assert.equal(game.revealedLetters, 3);
game.moveWord(-1);
game = render();
assert.equal(game.wordIndex, 2, 'backward navigation skips completed words and wraps');
game.changeTyped('gr');
game = render();
game.moveWord(1);
game = render();
assert.equal(game.wordIndex, 1);
assert.equal(game.typed, 'li');
game.changeTyped('like');
game = render();
assert.equal(game.wordIndex, 2);
assert.equal(game.typed, 'gr');
game.changeTyped('green');
game = render();
assert.equal(game.phase, 'success');
assert.equal(game.progress.totalCorrectWords, 4);
assert.equal(game.progress.xp, 10, 'using a hint prevents the perfect bonus');
assert.equal(spoken.at(-1), sentence.english);
game.changeTyped('green');
game = render();
assert.equal(game.progress.totalCorrectWords, 4, 'completion cannot count twice');
game.restartSentence();
game = render();
assert.equal(game.wordIndex, 0);
assert.deepEqual(game.completedWordIndices, []);
assert.deepEqual(game.wordDrafts, {});
assert.equal(game.typed, '');
console.log('Word navigation: out-of-order completion, drafts, hints, wrapping, scoring and reset passed.');
