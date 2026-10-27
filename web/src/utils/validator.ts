export function normalizeWord(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[.,!?;:。！？；：]+$/u, '');
}

export function isCorrectWord(actual: string, expected: string): boolean {
  return normalizeWord(actual) === normalizeWord(expected);
}

/** 用于逐字反馈；错误的前缀只会标红，不会立即清空用户输入。 */
export function isCorrectPrefix(actual: string, expected: string): boolean {
  return normalizeWord(expected).startsWith(normalizeWord(actual));
}

/** 提示从已正确输入的前缀之后继续，连续点击则逐字向后揭示。 */
export function nextHintLength(typed: string, expected: string, revealed: number): number {
  let correctLength = 0;
  while (correctLength < Math.min(typed.length, expected.length)
    && isCorrectPrefix(typed.slice(0, correctLength + 1), expected)) {
    correctLength += 1;
  }
  let next = Math.max(revealed, correctLength);
  while (next < expected.length && /\s/.test(expected[next])) next += 1;
  return Math.min(expected.length, next + 1);
}

/** Insert only expected word separators; explicit spaces in other positions remain errors. */
export function fillWordSpaces(value: string, expected: string): string {
  let result = '';
  for (const character of value) {
    while (result.length < expected.length && /\s/.test(expected[result.length]) && !/\s/.test(character)) {
      result += expected[result.length];
    }
    result += character;
  }
  return result;
}
