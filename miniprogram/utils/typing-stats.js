const { normalizeWord } = require('./validator');
// Count inserted/replaced characters, excluding deletions and generated hints.
function inputDelta(previous, next, expected) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start += 1;
  let end = next.length; let oldEnd = previous.length;
  while (end > start && oldEnd > start && next[end - 1] === previous[oldEnd - 1]) { end -= 1; oldEnd -= 1; }
  let correct = 0;
  for (let index = start; index < end; index += 1) {
    if (expected[index] && normalizeWord(next[index]) === normalizeWord(expected[index])) correct += 1;
  }
  return { input: end - start, correct };
}
function accuracy(counts) { return counts.input ? `${Math.round(counts.correct / counts.input * 100)}%` : '—'; }
module.exports = { inputDelta, accuracy };
