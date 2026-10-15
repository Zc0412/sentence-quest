import type { VocabularyWord } from '../types/game';
import catalog from './vocabulary-catalog.json';

export const vocabularyLists = catalog;
export type VocabularyListId = string;

export async function loadVocabularyWords(listId: VocabularyListId): Promise<VocabularyWord[]> {
  const list = vocabularyLists.find((item) => item.id === listId);
  if (!list) throw new Error('词库不存在');
  const response = await fetch(`/dictionaries/words/${encodeURIComponent(list.id)}.json`);
  if (!response.ok) throw new Error(`词库加载失败（${response.status}）`);
  const words: VocabularyWord[] = await response.json();
  if (!Array.isArray(words) || words.length !== list.wordCount || words.length === 0) {
    throw new Error('词库数据不完整，请重新加载');
  }
  return words;
}
