import rawSentences from './sentences.json';
import rawCET4TWords from './words/CET4_T.json';
import rawCET6TWords from './words/CET6_T.json';
import type { Sentence, VocabularyWord } from '../types/game';

export const sentences: Sentence[] = rawSentences;
export const cet4TWords: VocabularyWord[] = rawCET4TWords;
export const cet6TWords: VocabularyWord[] = rawCET6TWords;
export const vocabularyLists = [
  { id: 'CET4_T', label: 'CET-4 · T', words: cet4TWords },
  { id: 'CET6_T', label: 'CET-6 · T', words: cet6TWords },
] as const;
export type VocabularyListId = (typeof vocabularyLists)[number]['id'];
