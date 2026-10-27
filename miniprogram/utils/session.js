const { isCorrectWord, isCorrectPrefix, nextHintLength, fillWordSpaces } = require('./validator');
function start(item) { return { item, wordIndex: 0, typed: '', revealed: 0, dirty: false, done: false, error: '' }; }
function input(state, raw) {
  if (state.done) return state;
  const word = state.item.words[state.wordIndex];
  const typed = fillWordSpaces(raw, word);
  const wrong = !isCorrectPrefix(typed, word);
  const next = Object.assign({}, state, { typed, error: wrong ? '再想一下，可以听发音或查看提示' : '', dirty: state.dirty || wrong });
  if (typed.trim() && isCorrectWord(typed, word)) {
    next.wordIndex += 1; next.typed = ''; next.revealed = 0;
    next.done = next.wordIndex === state.item.words.length;
  }
  return next;
}
function hint(state) {
  if (state.done) return state;
  const word = state.item.words[state.wordIndex];
  return Object.assign({}, state, { dirty: true, revealed: nextHintLength(state.typed, word, state.revealed) });
}
module.exports = { start, input, hint };
