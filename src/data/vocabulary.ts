import type { VocabularyWord } from '../types/game';
import catalog from './vocabulary-catalog.json';

export const vocabularyLists = [
  ...catalog,
  ...(process.env.NODE_ENV === 'development' ? [{
    id: 'vocabulary-dev-test',
    label: '开发测试 · 三个单词',
    description: '仅开发环境显示，用三个单词快速测试单词练习流程。',
    wordCount: 3,
    category: '开发测试',
    tags: ['开发测试'],
  }] : []),
];
export type VocabularyListId = string;

export async function loadVocabularyWords(listId: VocabularyListId, signal?: AbortSignal): Promise<VocabularyWord[]> {
  const list = vocabularyLists.find((item) => item.id === listId);
  if (!list) throw new Error('词库不存在');
  const response = await fetch(`/dictionaries/words/${encodeURIComponent(list.id)}.json`, { signal });
  if (!response.ok) throw new Error(`词库加载失败（${response.status}）`);
  const words: VocabularyWord[] = await response.json();
  if (!Array.isArray(words) || words.length !== list.wordCount || words.length === 0) {
    throw new Error('词库数据不完整，请重新加载');
  }
  return words;
}
