import type { Progress } from '../types/game';
import { IndexedDbProgressRepository } from '../repositories/indexeddb-progress';
import { GUEST_PROFILE_ID } from '../repositories/progress';

// 仅用来将 v2.0 的旧数据导入 IndexedDB；新进度不再写入 localStorage。
const LEGACY_LOCAL_STORAGE_KEY = 'sentence-quest-progress-v1';
const repository = new IndexedDbProgressRepository();

export const EMPTY_PROGRESS: Progress = {
  completedIds: [],
  xp: 0,
  mistakes: {},
  totalCorrectWords: 0,
  perfectSentences: 0,
  activityByDate: {},
  knownVocabulary: [],
  vocabularyIndex: 0,
  vocabularyProgress: {},
};

/** 清洗从历史版本或浏览器数据库取得的数据，防止数据模型升级时页面崩溃。 */
export function normalizeProgress(value: unknown): Progress {
  const data: Partial<Progress> = value && typeof value === 'object' ? value as Partial<Progress> : {};
  const nonNegative = (candidate: unknown) =>
    typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, Math.floor(candidate)) : 0;
  const uniqueIds = Array.isArray(data.completedIds)
    ? [...new Set(data.completedIds.filter((id): id is string => typeof id === 'string'))]
    : [];
  const knownVocabulary = Array.isArray(data.knownVocabulary)
    ? [...new Set(data.knownVocabulary.filter((word): word is string => typeof word === 'string' && Boolean(word.trim())))]
    : [];
  const vocabularyProgress = data.vocabularyProgress && typeof data.vocabularyProgress === 'object' && !Array.isArray(data.vocabularyProgress)
    ? Object.fromEntries(Object.entries(data.vocabularyProgress).filter(
        ([id, entry]) => typeof id === 'string' && entry !== null && typeof entry === 'object' && !Array.isArray(entry),
      ).map(([id, entry]) => {
        const stored = entry as { knownWords?: unknown; index?: unknown };
        const words = Array.isArray(stored.knownWords)
          ? [...new Set(stored.knownWords.filter((word): word is string => typeof word === 'string' && Boolean(word.trim())))]
          : [];
        return [id, { knownWords: words, index: nonNegative(stored.index) }];
      }))
    : {};
  if (!vocabularyProgress.CET4_T && (knownVocabulary.length > 0 || nonNegative(data.vocabularyIndex) > 0)) {
    vocabularyProgress.CET4_T = { knownWords: knownVocabulary, index: nonNegative(data.vocabularyIndex) };
  }
  const mistakes = data.mistakes && typeof data.mistakes === 'object' && !Array.isArray(data.mistakes)
    ? Object.fromEntries(Object.entries(data.mistakes).filter(
        ([id, amount]) => typeof id === 'string' && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0,
      ).map(([id, amount]) => [id, nonNegative(amount)]))
    : {};
  const activityByDate = data.activityByDate && typeof data.activityByDate === 'object' && !Array.isArray(data.activityByDate)
    ? Object.fromEntries(Object.entries(data.activityByDate)
        .filter(([date, activity]) => /^\d{4}-\d{2}-\d{2}$/.test(date)
          && activity !== null && typeof activity === 'object' && !Array.isArray(activity))
        .map(([date, activity]) => {
          const daily = activity as { words?: unknown; sentences?: unknown };
          return [date, { words: nonNegative(daily.words), sentences: nonNegative(daily.sentences) }];
        }))
    : {};
  return {
    completedIds: uniqueIds,
    xp: nonNegative(data.xp),
    mistakes,
    totalCorrectWords: nonNegative(data.totalCorrectWords),
    perfectSentences: nonNegative(data.perfectSentences),
    activityByDate,
    knownVocabulary,
    vocabularyIndex: nonNegative(data.vocabularyIndex),
    vocabularyProgress,
  };
}

function readLegacy(): Progress | null {
  try {
    const json = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    return json ? normalizeProgress(JSON.parse(json) as unknown) : null;
  } catch { return null; }
}

function clearLegacy(): void {
  try { window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY); }
  catch { /* 部分隐私模式不允许访问 localStorage，忽略即可。 */ }
}

export type PersistenceMode = 'indexeddb' | 'memory';
export interface LoadedProgress {
  progress: Progress;
  persistence: PersistenceMode;
  migrated: boolean;
  warning?: string;
}

/** 读取失败时仍尽量保留旧版存档，并且绝不清除 IndexedDB。 */
export function fallbackProgress(warning: string): LoadedProgress {
  return {
    progress: readLegacy() ?? normalizeProgress(EMPTY_PROGRESS),
    persistence: 'memory',
    migrated: false,
    warning,
  };
}

/**
 * 优先 IndexedDB；仅在其中无进度时自动迁移旧 localStorage 数据。
 * 先完成数据库写入事务，再删除旧副本；若升级失败不会误删旧进度。
 * IndexedDB 禁用时仅用内存继续本页练习，并交给 UI 明确告警。
 */
export async function loadProgress(): Promise<LoadedProgress> {
  try {
    const saved = await repository.load(GUEST_PROFILE_ID);
    if (saved) {
      clearLegacy(); // 如迁移写入后恰好关闭页面，清理残留的旧副本。
      return { progress: normalizeProgress(saved), persistence: 'indexeddb', migrated: false };
    }
    const legacy = readLegacy();
    if (legacy) {
      // 与随后所有更新共用写队列，避免迁移写入覆盖用户新操作。
      await saveProgress(legacy);
      clearLegacy();
      return { progress: legacy, persistence: 'indexeddb', migrated: true };
    }
    return { progress: normalizeProgress(EMPTY_PROGRESS), persistence: 'indexeddb', migrated: false };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    return fallbackProgress(detail);
  }
}

// 顺序提交最新的 React state 快照，防止快速输入时异步写入乱序。
let writeQueue: Promise<void> = Promise.resolve();
export function saveProgress(progress: Progress): Promise<void> {
  const snapshot = normalizeProgress(progress);
  const pending = writeQueue.then(() => repository.save(GUEST_PROFILE_ID, snapshot));
  // 即使一次写入失败，未来调用仍能尝试继续写入。
  writeQueue = pending.catch(() => {});
  return pending;
}
