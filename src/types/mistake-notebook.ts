import type { Sentence } from './game';

export interface MistakeSnapshot {
  kind: 'word' | 'phrase';
  listId: string;
  itemId: string;
  sourceLabel: string;
  category?: string;
  group?: number;
  english: string;
  meaning: string;
  words: string[];
  phonetics: string[];
  sentence?: Sentence;
}

export interface MistakeEntry extends MistakeSnapshot {
  id: string;
  status: 'pending' | 'consolidated';
  mistakeCount: number;
  legacy: boolean;
  lastErrorAt: string | null;
  lastReviewAt: string | null;
  reviewCount: number;
  consecutivePerfect: number;
}

export interface MistakeNotebook {
  version: 1;
  entries: MistakeEntry[];
  importedIds: string[];
}
