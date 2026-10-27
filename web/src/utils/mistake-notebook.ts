import type { MistakeEntry, MistakeNotebook, MistakeSnapshot } from '../types/mistake-notebook';
import type { Sentence, VocabularyWord } from '../types/game';

export const EMPTY_NOTEBOOK: MistakeNotebook = { version: 1, entries: [], importedIds: [] };
export const mistakeId = (item: Pick<MistakeSnapshot, 'kind' | 'listId' | 'itemId'>) => JSON.stringify([item.kind, item.listId, item.itemId]);

export function wordMistake(listId: string, sourceLabel: string, word: VocabularyWord, group: number): MistakeSnapshot {
  return { kind: 'word', listId, itemId: word.name, sourceLabel, group, english: word.name, meaning: word.trans.join('；'), words: [word.name], phonetics: [word.ukphone ? `/${word.ukphone}/` : ''] };
}

export function phraseMistake(listId: string, sourceLabel: string, sentence: Sentence): MistakeSnapshot {
  return { kind: 'phrase', listId, itemId: sentence.id, sourceLabel, category: sentence.category, english: sentence.english, meaning: sentence.zh, words: sentence.words, phonetics: sentence.annotations.map((item) => item.phonetic), sentence };
}

export function newMistake(item: MistakeSnapshot, legacy = false): MistakeEntry {
  return { ...item, id: mistakeId(item), status: 'pending', mistakeCount: 0, legacy, lastErrorAt: null, lastReviewAt: null, reviewCount: 0, consecutivePerfect: 0 };
}

export function recordMistake(state: MistakeNotebook, item: MistakeSnapshot, at: string): MistakeNotebook {
  const id = mistakeId(item);
  const old = state.entries.find((entry) => entry.id === id) ?? newMistake(item);
  const { kind, listId, itemId, sourceLabel, category, group, english, meaning, words, phonetics, sentence } = item;
  const next: MistakeEntry = { ...old, kind, listId, itemId, sourceLabel, category, group, english, meaning, words, phonetics, sentence, id, status: 'pending', mistakeCount: old.mistakeCount + 1, lastErrorAt: at, consecutivePerfect: 0 };
  return { ...state, entries: [...state.entries.filter((entry) => entry.id !== id), next] };
}

export function reviewMistake(state: MistakeNotebook, id: string, perfect: boolean, at: string): MistakeNotebook {
  return { ...state, entries: state.entries.map((entry) => {
    if (entry.id !== id) return entry;
    const consecutivePerfect = perfect ? entry.consecutivePerfect + 1 : 0;
    return { ...entry, consecutivePerfect, reviewCount: entry.reviewCount + 1, lastReviewAt: at, status: consecutivePerfect >= 2 ? 'consolidated' : 'pending' };
  }) };
}

export function markMistake(state: MistakeNotebook, id: string, consolidated: boolean): MistakeNotebook {
  return { ...state, entries: state.entries.map((entry) => entry.id === id ? { ...entry, status: consolidated ? 'consolidated' : 'pending', consecutivePerfect: consolidated ? 2 : 0 } : entry) };
}

export function importMistakes(state: MistakeNotebook, items: MistakeSnapshot[]): MistakeNotebook {
  const seen = new Set([...state.importedIds, ...state.entries.map((entry) => entry.id)]);
  const imported = items.filter((item) => { const id = mistakeId(item); if (seen.has(id)) return false; seen.add(id); return true; });
  return { ...state, entries: [...state.entries, ...imported.map((item) => newMistake(item, true))], importedIds: [...seen] };
}

export function clearMistakes(state: MistakeNotebook, listId?: string, itemIds?: string[]): MistakeNotebook {
  const removed = state.entries.filter((entry) => !listId || (entry.listId === listId && (!itemIds || itemIds.includes(entry.itemId))));
  const ids = new Set(removed.map((entry) => entry.id));
  return { ...state, entries: state.entries.filter((entry) => !ids.has(entry.id)), importedIds: [...new Set([...state.importedIds, ...ids])] };
}

export function normalizeNotebook(value: unknown): MistakeNotebook {
  if (!value || typeof value !== 'object') return { ...EMPTY_NOTEBOOK };
  const data = value as Partial<MistakeNotebook>;
  const nonNegative = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const date = (s: unknown) => typeof s === 'string' && Number.isFinite(Date.parse(s)) ? s : null;
  const seen = new Set<string>();
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter((entry) => {
    if (!entry || typeof entry !== 'object' || !['word', 'phrase'].includes(entry.kind)
      || !['listId', 'itemId', 'sourceLabel', 'english', 'meaning'].every((key) => typeof (entry as unknown as Record<string, unknown>)[key] === 'string')
      || !Array.isArray(entry.words) || !entry.words.length || !entry.words.every((word) => typeof word === 'string' && word.trim())) return false;
    const id = mistakeId(entry);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((entry): MistakeEntry => ({
    ...entry, id: mistakeId(entry),
    status: entry.status === 'consolidated' ? 'consolidated' : 'pending',
    legacy: Boolean(entry.legacy), mistakeCount: nonNegative(entry.mistakeCount), reviewCount: nonNegative(entry.reviewCount), consecutivePerfect: nonNegative(entry.consecutivePerfect),
    lastErrorAt: date(entry.lastErrorAt), lastReviewAt: date(entry.lastReviewAt),
    phonetics: Array.isArray(entry.phonetics) ? entry.phonetics.map((s) => typeof s === 'string' ? s : '') : [],
  }));
  return { version: 1, entries, importedIds: Array.isArray(data.importedIds) ? [...new Set(data.importedIds.filter((id) => typeof id === 'string'))] : [] };
}
