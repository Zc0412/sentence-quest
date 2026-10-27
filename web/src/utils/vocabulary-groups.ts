import type { VocabularyProgress, VocabularyWord } from '../types/game';

export const VOCABULARY_GROUP_SIZE = 50;

export function vocabularyGroups(wordCount: number) {
  return Array.from({ length: Math.ceil(wordCount / VOCABULARY_GROUP_SIZE) }, (_, index) => {
    const start = index * VOCABULARY_GROUP_SIZE;
    const end = Math.min(start + VOCABULARY_GROUP_SIZE, wordCount);
    return { id: index + 1, label: `第 ${index + 1} 组`, start, end, count: end - start };
  });
}

export function vocabularyGroupProgress(words: VocabularyWord[], progress: VocabularyProgress, group: number): VocabularyProgress {
  const start = (group - 1) * VOCABULARY_GROUP_SIZE;
  const members = new Set(words.map((word) => word.name));
  const savedIndex = progress.groupIndices?.[group] ?? progress.index;
  const knownWords = progress.knownWords.filter((word) => members.has(word));
  const localIndex = savedIndex - start;
  const unfinished = words.findIndex((word) => !knownWords.includes(word.name));
  return {
    knownWords,
    mistakeWords: progress.mistakeWords?.filter((word) => members.has(word)),
    index: localIndex >= 0 && localIndex < words.length ? localIndex : Math.max(0, unfinished),
  };
}

export function withVocabularyIndex(progress: VocabularyProgress, index: number, group?: number): VocabularyProgress {
  return {
    ...progress,
    index,
    ...(group ? { groupIndices: { ...progress.groupIndices, [group]: index } } : {}),
  };
}
