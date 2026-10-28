export interface XpEntry {
  at: string;
  kind: 'word' | 'phrase' | 'sentence';
  listId: string;
  sourceLabel: string;
  text: string;
  meaning: string;
  amount: number;
  perfect: boolean;
}
