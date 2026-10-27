import type { PhrasePracticeList } from './phrase-practice';
import type { Sentence } from '../types/game';

function isSentence(value: unknown): value is Sentence {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.unit === 'number'
    && typeof item.category === 'string'
    && typeof item.zh === 'string'
    && typeof item.english === 'string'
    && Array.isArray(item.words)
    && item.words.every((word) => typeof word === 'string')
    && typeof item.note === 'string'
    && Array.isArray(item.annotations)
    && Array.isArray(item.grammar);
}

export async function loadPhraseSentences(list: PhrasePracticeList, signal?: AbortSignal): Promise<Sentence[]> {
  const response = await fetch(list.file, { signal });
  if (!response.ok) throw new Error(`题库加载失败（HTTP ${response.status}）`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || data.length === 0 || !data.every(isSentence)) {
    throw new Error('题库数据格式不正确或内容为空');
  }
  return data.map((sentence) => ({ ...sentence, id: `${list.id}:${sentence.id}` }));
}
