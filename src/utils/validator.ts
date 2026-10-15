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
