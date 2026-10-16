export interface WordAnnotation {
  phonetic: string;
  meaning: string;
  pos: string;
  color: string;
}

export interface GrammarGroup {
  role: string;
  start: number;
  end: number;
  color: string;
  explanation: string;
}

export interface Sentence {
  id: string;
  unit: number;
  category: string;
  zh: string;
  english: string;
  words: string[];
  note: string;
  annotations: WordAnnotation[];
  grammar: GrammarGroup[];
}

export interface DailyActivity {
  words: number;
  sentences: number;
}

export interface VocabularyWord {
  name: string;
  trans: string[];
  usphone?: string;
  ukphone?: string;
}

export interface VocabularyProgress {
  knownWords: string[];
  index: number;
  mistakeWords?: string[];
  groupIndices?: Record<string, number>;
}

export type GameMode = 'challenge' | 'review';
export type GamePhase = 'playing' | 'success' | 'allDone' | 'noMistakes' | 'reviewDone';

export interface Progress {
  completedIds: string[];
  xp: number;
  mistakes: Record<string, number>;
  totalCorrectWords: number;
  perfectSentences: number;
  activityByDate: Record<string, DailyActivity>;
  knownVocabulary: string[];
  vocabularyIndex: number;
  vocabularyProgress: Record<string, VocabularyProgress>;
}
