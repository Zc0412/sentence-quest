export type LearningKind = 'word' | 'sentence';
export interface LearningEntry {
  id: string;
  kind: LearningKind;
  text: string;
  meaning: string;
  at: string;
  day: string;
}
export interface LearningHistory {
  version: 1;
  entries: LearningEntry[];
}
