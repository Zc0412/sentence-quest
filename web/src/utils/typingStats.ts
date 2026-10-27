import { normalizeWord } from './validator';

/** 只统计本次新增/替换的字符；删除不抵消之前的输入记录。 */
export function countTypingAttempt(previous: string, next: string, expected: string) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start += 1;
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start && previous[previousEnd - 1] === next[nextEnd - 1]) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  let correct = 0;
  for (let index = start; index < nextEnd; index += 1) {
    if (normalizeWord(next[index]) === normalizeWord(expected[index] ?? '')) correct += 1;
  }
  return { input: nextEnd - start, correct };
}
