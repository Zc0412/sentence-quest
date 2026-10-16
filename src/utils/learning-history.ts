import type { LearningEntry, LearningHistory } from '../types/learning-history';

export const EMPTY_HISTORY: LearningHistory = { version: 1, entries: [] };
export const HISTORY_LIMIT = 1800;

export function normalizeHistory(value: unknown): LearningHistory {
  if (!value || typeof value !== 'object') return { ...EMPTY_HISTORY };
  const data = value as Partial<LearningHistory>;
  if (data.version !== 1 || !Array.isArray(data.entries)) return { ...EMPTY_HISTORY };
  const entries = data.entries.filter((entry) => entry && typeof entry === 'object'
    && typeof entry.id === 'string' && (entry.kind === 'word' || entry.kind === 'sentence')
    && typeof entry.text === 'string' && typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at))
    && typeof entry.day === 'string').map((entry) => ({
      id: entry.id, kind: entry.kind, text: entry.text,
      meaning: typeof entry.meaning === 'string' ? entry.meaning.slice(0, 1000) : '',
      at: entry.at, day: entry.day,
    })).slice(-HISTORY_LIMIT);
  return { version: 1, entries };
}

export function recordLearning(state: LearningHistory, entry: LearningEntry): LearningHistory {
  if (state.entries.some((old) => old.id === entry.id)) return state;
  return { ...state, entries: [...state.entries, entry].slice(-HISTORY_LIMIT) };
}
