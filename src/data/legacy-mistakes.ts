import { vocabularyLists, loadVocabularyWords } from './vocabulary';
import { phrasePracticeLists } from './phrase-practice';
import { loadPhraseSentences } from './phrase-sentences';
import homePhrases from './home-phrases.json';
import { sentences } from './index';
import type { Progress } from '../types/game';
import type { MistakeNotebook, MistakeSnapshot } from '../types/mistake-notebook';
import { mistakeId, phraseMistake, wordMistake } from '../utils/mistake-notebook';
import { VOCABULARY_GROUP_SIZE } from '../utils/vocabulary-groups';

export async function loadLegacyMistakes(progress: Progress, notebook: MistakeNotebook) {
  const existing = new Set([...notebook.importedIds, ...notebook.entries.map((entry) => entry.id)]);
  const items: MistakeSnapshot[] = [];
  const warnings: string[] = [];
  const tasks: (() => Promise<void>)[] = [];
  for (const [listId, bank] of Object.entries(progress.vocabularyProgress)) {
    const names = (bank.mistakeWords ?? []).filter((name) => !existing.has(mistakeId({ kind: 'word', listId, itemId: name })));
    if (!names.length) continue;
    const list = vocabularyLists.find((item) => item.id === listId);
    if (!list) { warnings.push(`${listId}：题库当前不可用，原错词记录仍保留。`); continue; }
    tasks.push(async () => {
      const words = await loadVocabularyWords(listId, AbortSignal.timeout(10000));
      const wanted = new Set(names);
      let found = 0;
      words.forEach((word, index) => {
        if (wanted.has(word.name)) { items.push(wordMistake(listId, list.label, word, Math.floor(index / VOCABULARY_GROUP_SIZE) + 1)); found += 1; }
      });
      if (found < wanted.size) warnings.push(`${list.label}：部分旧词条已不在题库中，原记录仍保留。`);
    });
  }
  const phraseIds = new Set(Object.entries(progress.mistakes).filter(([, count]) => count > 0).map(([id]) => id));
  const handled = new Set<string>();
  for (const [listId, label, data] of [
    ['home-phrases', '精选短语 · 20 句', homePhrases],
    ['CET4_T', '句子练习', sentences],
  ] as const) {
    for (const sentence of data) {
      if (!phraseIds.has(sentence.id)) continue;
      handled.add(sentence.id);
      const snapshot = phraseMistake(listId, label, sentence);
      if (!existing.has(mistakeId(snapshot))) items.push(snapshot);
    }
  }
  for (const list of phrasePracticeLists) {
    const ids = [...phraseIds].filter((id) => id.startsWith(`${list.id}:`));
    ids.forEach((id) => handled.add(id));
    const missing = ids.filter((itemId) => !existing.has(mistakeId({ kind: 'phrase', listId: list.id, itemId })));
    if (!missing.length) continue;
    tasks.push(async () => {
      const data = await loadPhraseSentences(list, AbortSignal.timeout(10000));
      const wanted = new Set(missing);
      const found = data.filter((sentence) => wanted.has(sentence.id));
      items.push(...found.map((sentence) => phraseMistake(list.id, list.label, sentence)));
      if (found.length < wanted.size) warnings.push(`${list.label}：部分旧题目当前不可用，原记录仍保留。`);
    });
  }
  if ([...phraseIds].some((id) => !handled.has(id) && !notebook.entries.some((entry) => entry.itemId === id))) {
    warnings.push('部分旧短语题库当前不可用，原错题记录仍保留。');
  }
  // Load only affected sources, with bounded concurrency.
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      try { await task(); } catch { warnings.push('部分旧题库加载失败，可重试导入；原学习进度不受影响。'); }
    }
  }));
  return { items, warnings: [...new Set(warnings)] };
}
