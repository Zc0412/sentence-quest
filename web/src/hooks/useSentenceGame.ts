import { useEffect, useRef, useState } from 'react';
import { sentences } from '../data';
import type { VocabularyListId } from '../data';
import type { GameMode, GamePhase, Progress, Sentence } from '../types/game';
import { EMPTY_PROGRESS, fallbackProgress, loadProgress, saveProgress } from '../utils/storage';
import type { LoadedProgress } from '../utils/storage';
import { isCorrectWord, isCorrectPrefix, nextHintLength } from '../utils/validator';
import { speakWord, stopSpeech } from '../utils/speech';
import { withVocabularyIndex } from '../utils/vocabulary-groups';
import { practiceXp } from '../utils/practice-xp';
import { appendXpEntry } from '../utils/xp-history';

function nextUnfinished(completedIds: string[], sentenceList: Sentence[]): Sentence | undefined {
  return sentenceList.find((item) => !completedIds.includes(item.id));
}

function nextInList(ids: string[], currentId: string): string | undefined {
  if (ids.length === 0) return undefined;
  const currentIndex = ids.indexOf(currentId);
  return ids[(currentIndex + 1) % ids.length];
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useSentenceGame(
  sentenceList: Sentence[] = sentences,
  { readWholeOnCompletion = false, onLearning, onMistake, onReviewComplete, xpSource }: {
    readWholeOnCompletion?: boolean;
    onLearning?: (kind: 'word' | 'sentence', text: string, meaning: string) => void;
    onMistake?: (sentence: Sentence) => void;
    onReviewComplete?: (sentence: Sentence, perfect: boolean) => void;
    xpSource?: { listId: string; label: string; kind: 'phrase' | 'sentence' };
  } = {},
) {
  // 服务端与客户端首屏渲染统一使用空进度，避免 hydration mismatch。
  // 浏览器存档只在 mount 后载入，载入完成前禁止将默认数据写回。
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<'loading' | 'indexeddb' | 'memory'>('loading');
  const [storageWarning, setStorageWarning] = useState('');
  const skipInitialSave = useRef(true);
  const [mode, setMode] = useState<GameMode>('challenge');
  const [sentenceId, setSentenceId] = useState<string>(sentenceList[0].id);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [mistakesThisSentence, setMistakesThisSentence] = useState(0);
  const [hintsThisSentence, setHintsThisSentence] = useState(0);
  const [extraRevealed, setExtraRevealed] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [focusSignal, setFocusSignal] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [completedWordIndices, setCompletedWordIndices] = useState<number[]>([]);
  const [wordDrafts, setWordDrafts] = useState<Record<number, { typed: string; error: string; revealed: number }>>({});

  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    const completeLoading = (loaded: LoadedProgress) => {
      // 即使后面才收到 IndexedDB 返回，也不能覆盖用户在内存里已做的题目。
      if (cancelled || resolved) return;
      resolved = true;
      window.clearTimeout(watchdog);
      const { progress: saved, persistence, warning } = loaded;
      setProgress(saved);
      const unfinished = nextUnfinished(saved.completedIds, sentenceList);
      setSentenceId(unfinished?.id ?? sentenceList[0].id);
      setPhase(unfinished ? 'playing' : 'allDone');
      setStorageStatus(persistence);
      setStorageWarning(warning ?? '');
      setHydrated(true);
    };
    // 双重保险：若任何未预料到的异步异常导致 loadProgress 挂起，也必须退出 loading。
    const watchdog = window.setTimeout(() => {
      completeLoading(fallbackProgress('读取学习进度超时；可继续练习，但当前页面的修改不会持久保存。'));
    }, 9000);
    void loadProgress().then(completeLoading).catch((error: unknown) => {
      completeLoading(fallbackProgress(error instanceof Error ? error.message : '读取学习进度失败'));
    });
    return () => { cancelled = true; window.clearTimeout(watchdog); };
  }, [sentenceList]);

  useEffect(() => {
    if (!hydrated) return;
    // 首次加载只是读取，不把初始化状态作为一次新修改写回数据库。
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (storageStatus !== 'indexeddb') return;
    let cancelled = false;
    void saveProgress(progress).catch(() => {
      if (!cancelled) {
        setStorageWarning('IndexedDB 保存失败；本次练习只保存在当前页面内存中。');
        setStorageStatus('memory');
      }
    });
    return () => { cancelled = true; };
  }, [progress, hydrated, storageStatus]);

  const sentence = sentenceList.find((item) => item.id === sentenceId) ?? sentenceList[0];
  const courseIndex = sentenceList.findIndex((item) => item.id === sentence.id);
  const reviewIds = sentenceList.filter((item) => (progress.mistakes[item.id] ?? 0) > 0)
    .map((item) => item.id);
  const completedCount = sentenceList.filter((item) => progress.completedIds.includes(item.id)).length;
  const currentWord = sentence.words[wordIndex] ?? '';
  const revealedLetters = Math.min(currentWord.length, extraRevealed);

  function startSentence(id: string) {
    stopSpeech();
    setSentenceId(id);
    setWordIndex(0);
    setCompletedWordIndices([]);
    setWordDrafts({});
    setTyped('');
    setError('');
    setMistakesThisSentence(0);
    setHintsThisSentence(0);
    setExtraRevealed(0);
    setEarnedXp(0);
    setPhase('playing');
    setFocusSignal((value) => value + 1);
  }

  function acceptCurrentWord() {
    if (completedWordIndices.includes(wordIndex)) return;
    const completed = [...completedWordIndices, wordIndex];
    setCompletedWordIndices(completed);
    const sentenceFinished = completed.length === sentence.words.length;
    onLearning?.('word', currentWord, sentence.annotations[wordIndex]?.meaning ?? '');
    if (sentenceFinished) onLearning?.('sentence', sentence.english, sentence.zh);
    const today = localDateKey();
    setProgress((old) => {
      const todayActivity = old.activityByDate[today] ?? { words: 0, sentences: 0 };
      return {
        ...old,
        totalCorrectWords: old.totalCorrectWords + 1,
        activityByDate: {
          ...old.activityByDate,
          [today]: {
            words: todayActivity.words + 1,
            sentences: todayActivity.sentences + (sentenceFinished ? 1 : 0),
          },
        },
      };
    });
    setTyped('');
    setError('');
    setExtraRevealed(0);
    speakWord(sentenceFinished && readWholeOnCompletion ? sentence.english : currentWord);

    if (!sentenceFinished) {
      const nextIndex = Array.from({ length: sentence.words.length }, (_, offset) => (wordIndex + offset + 1) % sentence.words.length)
        .find((index) => !completed.includes(index))!;
      restoreWord(nextIndex);
      return;
    }

    // 重刷已完成的句子可以练习，但不重复刷 XP。
    const isFirstPass = mode === 'challenge' && !isReplaying && !progress.completedIds.includes(sentence.id);
    const isPerfect = mistakesThisSentence === 0 && hintsThisSentence === 0;
    if (mode === 'review') onReviewComplete?.(sentence, isPerfect);
    const reward = practiceXp(isFirstPass, isPerfect);
    setEarnedXp(reward);
    setWordIndex(sentence.words.length);
    setPhase('success');
    if (mode === 'review') setReviewedIds((ids) => ids.includes(sentence.id) ? ids : [...ids, sentence.id]);
    const awardedAt = new Date().toISOString();
    setProgress((old) => !isFirstPass || old.completedIds.includes(sentence.id) ? old : ({
      ...old,
      completedIds: [...old.completedIds, sentence.id],
      xp: old.xp + reward,
      xpHistory: appendXpEntry(old.xpHistory, {
        at: awardedAt, kind: xpSource?.kind ?? 'sentence', listId: xpSource?.listId ?? 'sentences',
        sourceLabel: xpSource?.label ?? '句子练习', text: sentence.english, meaning: sentence.zh,
        amount: reward, perfect: isPerfect,
      }),
      perfectSentences: old.perfectSentences + (isFirstPass && isPerfect ? 1 : 0),
    }));
  }

  function restoreWord(index: number) {
    const draft = wordDrafts[index];
    setWordIndex(index);
    setTyped(draft?.typed ?? '');
    setError(draft?.error ?? '');
    setExtraRevealed(draft?.revealed ?? 0);
    setFocusSignal((value) => value + 1);
  }

  function selectWord(index: number) {
    if (phase !== 'playing' || index < 0 || index >= sentence.words.length || completedWordIndices.includes(index)) return;
    setWordDrafts((drafts) => ({ ...drafts, [wordIndex]: { typed, error, revealed: extraRevealed } }));
    if (index === wordIndex) { setFocusSignal((value) => value + 1); return; }
    restoreWord(index);
  }

  function moveWord(direction: number) {
    for (let offset = 1; offset <= sentence.words.length; offset += 1) {
      const index = (wordIndex + direction * offset + sentence.words.length) % sentence.words.length;
      if (!completedWordIndices.includes(index)) { selectWord(index); return; }
    }
  }

  // 逐字即时验证；打完正确单词即自动通过，无需按空格、回车或按钮。
  function changeTyped(value: string) {
    if (phase !== 'playing' || !currentWord) return;
    const clean = value.replace(/[\s\u00a0]+/g, '').slice(0, currentWord.length);
    if (clean && isCorrectWord(clean, currentWord)) {
      acceptCurrentWord();
      return;
    }

    const validPrefix = !clean || isCorrectPrefix(clean, currentWord);
    if (!validPrefix && !error) {
      if (mistakesThisSentence === 0) onMistake?.(sentence);
      setMistakesThisSentence((count) => count + 1);
      setProgress((old) => ({
        ...old,
        mistakes: {
          ...old.mistakes,
          [sentence.id]: (old.mistakes[sentence.id] ?? 0) + 1,
        },
      }));
    }
    setTyped(clean);
    setError(validPrefix ? '' : '有字母拼错了，按 Backspace 修改；按 Esc 清空当前词。');
  }

  function revealHint() {
    if (phase !== 'playing' || extraRevealed >= currentWord.length) return;
    setExtraRevealed((count) => nextHintLength(typed, currentWord, count));
    setHintsThisSentence((count) => count + 1);
    setFocusSignal((value) => value + 1);
  }

  function nextSentence() {
    if (isReplaying && mode === 'challenge') {
      const next = sentenceList[courseIndex + 1];
      if (next) startSentence(next.id);
      else { setIsReplaying(false); setPhase('allDone'); }
      return;
    }
    if (mode === 'review') {
      const remainingReviews = reviewIds.filter((id) => !reviewedIds.includes(id));
      if (remainingReviews.length > 0) startSentence(remainingReviews[0]);
      else setPhase('reviewDone');
      return;
    }
    const remaining = sentenceList
      .filter((item) => !progress.completedIds.includes(item.id))
      .map((item) => item.id);
    if (remaining.length === 0) {
      setPhase('allDone');
      return;
    }
    // 优先向后继续；最后一题时回绕到最前面的未完成题。
    const forward = remaining.find((id) => sentenceList.findIndex((s) => s.id === id) > courseIndex);
    startSentence(forward ?? remaining[0]);
  }

  function skipSentence() {
    if (mode === 'review') {
      const pending = reviewIds.filter((id) => !reviewedIds.includes(id));
      const nextId = nextInList(pending, sentence.id);
      if (nextId) startSentence(nextId);
      return;
    }
    const ids = sentenceList.map((item) => item.id);
    const nextId = nextInList(ids, sentence.id);
    if (nextId) startSentence(nextId);
  }

  function selectSentence(id: string) {
    if (!sentenceList.some((item) => item.id === id)) return;
    setIsReplaying(false);
    setMode('challenge');
    startSentence(id);
  }

  function changeMode(nextMode: GameMode) {
    if (!hydrated) return;
    setIsReplaying(false);
    setMode(nextMode);
    if (nextMode === 'review') {
      setReviewedIds([]);
      if (reviewIds.length > 0) startSentence(reviewIds[0]);
      else setPhase('noMistakes');
      return;
    }
    const next = nextUnfinished(progress.completedIds, sentenceList);
    if (next) startSentence(next.id);
    else setPhase('allDone');
  }

  function replayCourse() {
    setIsReplaying(true);
    setMode('challenge');
    setReviewedIds([]);
    startSentence(sentenceList[0].id);
  }

  function resetProgress() {
    if (!hydrated) return;
    setIsReplaying(false);
    setProgress({ ...EMPTY_PROGRESS, completedIds: [], mistakes: {} });
    setMode('challenge');
    setReviewedIds([]);
    startSentence(sentenceList[0].id);
  }

  function resetSentenceListProgress() {
    if (!hydrated) return;
    const sentenceIds = new Set(sentenceList.map((item) => item.id));
    setProgress((old) => ({
      ...old,
      completedIds: old.completedIds.filter((id) => !sentenceIds.has(id)),
      mistakes: Object.fromEntries(Object.entries(old.mistakes).filter(([id]) => !sentenceIds.has(id))),
    }));
    setIsReplaying(false);
    setMode('challenge');
    setReviewedIds([]);
    startSentence(sentenceList[0].id);
  }

  function setVocabularyIndex(listId: VocabularyListId, index: number, group?: number) {
    if (!Number.isInteger(index) || index < 0) return;
    setProgress((old) => ({
      ...old,
      vocabularyIndex: listId === 'CET4_T' ? index : old.vocabularyIndex,
      vocabularyProgress: {
        ...old.vocabularyProgress,
        [listId]: withVocabularyIndex(old.vocabularyProgress[listId] ?? { knownWords: [], index: 0 }, index, group),
      },
    }));
  }

  function recordVocabularyCorrect(listId: VocabularyListId, word: string, nextIndex: number, group?: number, { perfect = false, review = false, sourceLabel = listId, meaning = '' }: { perfect?: boolean; review?: boolean; sourceLabel?: string; meaning?: string } = {}) {
    const today = localDateKey();
    const awardedAt = new Date().toISOString();
    setProgress((old) => {
      const todayActivity = old.activityByDate[today] ?? { words: 0, sentences: 0 };
      const bankProgress = old.vocabularyProgress[listId] ?? { knownWords: [], index: 0 };
      const knownWords = new Set(bankProgress.knownWords);
      const allKnownWords = new Set(old.knownVocabulary);
      const reward = practiceXp(!review && !knownWords.has(word), perfect);
      if (!review) {
        knownWords.add(word);
        allKnownWords.add(word);
      }
      return {
        ...old,
        xp: old.xp + reward,
        ...(reward > 0 ? { xpHistory: appendXpEntry(old.xpHistory, {
          at: awardedAt, kind: 'word', listId, sourceLabel: group ? `${sourceLabel} · 第 ${group} 组` : sourceLabel,
          text: word, meaning, amount: reward, perfect,
        }) } : {}),
        knownVocabulary: [...allKnownWords],
        vocabularyIndex: listId === 'CET4_T' ? nextIndex : old.vocabularyIndex,
        vocabularyProgress: {
          ...old.vocabularyProgress,
          [listId]: withVocabularyIndex({ ...bankProgress, knownWords: [...knownWords] }, nextIndex, group),
        },
        activityByDate: {
          ...old.activityByDate,
          [today]: { ...todayActivity, words: todayActivity.words + 1 },
        },
      };
    });
  }

  function recordVocabularyMistake(listId: VocabularyListId, word: string) {
    setProgress((old) => {
      const bank = old.vocabularyProgress[listId] ?? { knownWords: [], index: 0 };
      return {
        ...old,
        vocabularyProgress: {
          ...old.vocabularyProgress,
          [listId]: { ...bank, mistakeWords: [...new Set([...(bank.mistakeWords ?? []), word])] },
        },
      };
    });
  }

  return {
    ready: hydrated,
    storageStatus,
    storageWarning,
    progress,
    mode,
    isReplaying,
    phase,
    sentence,
    courseIndex,
    completedCount,
    reviewCount: reviewIds.length,
    wordIndex,
    completedWordIndices,
    wordDrafts,
    selectWord,
    moveWord,
    currentWord,
    revealedLetters,
    typed,
    error,
    mistakesThisSentence,
    hintsThisSentence,
    earnedXp,
    focusSignal,
    changeTyped,
    speakWord,
    revealHint,
    nextSentence,
    skipSentence,
    selectSentence,
    changeMode,
    replayCourse,
    restartSentence: () => startSentence(sentence.id),
    resetProgress,
    resetSentenceListProgress,
    setVocabularyIndex,
    recordVocabularyCorrect,
    recordVocabularyMistake,
  };
}

export type SentenceGame = ReturnType<typeof useSentenceGame>;
