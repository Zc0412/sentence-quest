'use client';

import { useKeyboardPlatform } from '@/hooks/useKeyboardPlatform';
import { ShortcutHint } from './ShortcutHint';

import { usePracticeSettings } from './PracticeSettingsProvider';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Lightbulb, SkipForward, Volume2 } from 'lucide-react';
import { PracticeNavigation } from './PracticeNavigation';
import { TypingStatistics } from './TypingStatistics';
import { MasteryPanel } from './MasteryPanel';
import type { VocabularyProgress, VocabularyWord } from '../types/game';
import { ExercisePrompt } from './ExercisePrompt';
import { PracticeSpellingBoard } from './PracticeSpellingBoard';
import { isCorrectPrefix, isCorrectWord, nextHintLength, fillWordSpaces } from '../utils/validator';
import { Button } from './ui/button';
import { countTypingAttempt } from '../utils/typingStats';
import { loadPronunciationAudio } from '../utils/speech';
import { usePracticeShortcuts } from '../hooks/usePracticeShortcuts';

interface Props {
  words: VocabularyWord[];
  listLabel: string;
  progress: VocabularyProgress;
  pronunciationType: '1' | '2';
  onSelectIndex: (index: number) => void;
  onCorrect: (word: string, nextIndex: number, result: { perfect: boolean; review: boolean }) => void;
  onMistake: (word: string) => void;
  onSpeak: (word: string) => void;
}

export function VocabularyModule({ words, listLabel, progress, pronunciationType, onSelectIndex, onCorrect, onMistake, onSpeak }: Props) {
  const { hintsEnabled, ready: settingsReady } = usePracticeSettings();
  const { keyLabel } = useKeyboardPlatform();
  const [typed, setTyped] = useState('');
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);
  const attempts = useRef<Record<number, { mistake?: boolean; hint?: boolean }>>({});
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState('');
  const [revealedLetters, setRevealedLetters] = useState(0);
  const [typingStats, setTypingStats] = useState({ input: 0, correct: 0 });
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [wordOrder, setWordOrder] = useState<number[] | null>(null);
  const [reviewOrder, setReviewOrder] = useState<number[] | null>(null);
  const [reviewedIndices, setReviewedIndices] = useState<number[]>([]);
  const currentIndex = Math.min(Math.max(progress.index, 0), words.length - 1);
  const initialIndex = useRef(currentIndex);
  const practiceOrder = wordOrder ?? words.map((_, index) => index);
  const order = reviewOrder ?? practiceOrder;
  const reviewFinished = reviewOrder !== null && reviewOrder.every((index) => reviewedIndices.includes(index));
  const currentPosition = order.indexOf(currentIndex);
  const currentWord = words[currentIndex];
  const firstMeaning = currentWord.trans[0]?.trim() ?? '';
  const coreMeaning = firstMeaning.split(/[；;]/).slice(0, 2).join('；');
  const shortMeaning = coreMeaning.length > 48 ? `${coreMeaning.slice(0, 48)}…` : coreMeaning;
  const hasMoreMeanings = currentWord.trans.length > 1 || shortMeaning !== firstMeaning;
  const spellingWord = currentWord.name.normalize('NFKC').replace(/[“”]/g, '"').replace(/⋯/g, '...').replace(/\s+/g, ' ');
  const previousIndex = order[currentPosition - 1];
  const nextIndex = order[currentPosition + 1];
  const previousWord = previousIndex === undefined ? undefined : words[previousIndex];
  const nextWord = nextIndex === undefined ? undefined : words[nextIndex];
  const knownWords = useMemo(() => new Set(progress.knownWords), [progress.knownWords]);
  const allKnown = words.length > 0 && words.every((word) => knownWords.has(word.name));
  const showMastery = reviewOrder === null && allKnown && !summaryDismissed;
  const progressItems = useMemo(() => words.map((word) => ({ id: word.name, text: word.name, meaning: word.trans.join('；'), completed: knownWords.has(word.name) })), [words, knownWords]);
  useEffect(() => {
    const shuffled = words.map((_, index) => index);
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    const start = shuffled.indexOf(initialIndex.current);
    setWordOrder([...shuffled.slice(start), ...shuffled.slice(0, start)]);
  }, [words]);

  useEffect(() => {
    if (!wordOrder) return;
    const wordsToPreload = [currentWord.name, nextWord?.name].filter((word): word is string => Boolean(word));
    void Promise.allSettled(wordsToPreload.map((word) => loadPronunciationAudio(word, pronunciationType)));
  }, [currentWord.name, nextWord?.name, pronunciationType, wordOrder]);

  function cancelAdvance() {
    if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }

  useEffect(() => {
    completedRef.current = false;
    setCompleted(false);
    setTyped('');
    setError('');
    setRevealedLetters(0);
    return cancelAdvance;
  }, [currentIndex]);

  function moveTo(index: number) {
    cancelAdvance();
    completedRef.current = false;
    setCompleted(false);
    onSelectIndex(Math.min(Math.max(index, 0), words.length - 1));
    setTyped('');
    setError('');
    setRevealedLetters(0);
    attempts.current[index] = {};
  }

  function changeTyped(value: string) {
    if (completedRef.current || showMastery || reviewFinished) return;
    const filtered = Array.from(value).filter((letter) => /^[a-zA-Z'’-]$/.test(letter) || spellingWord.includes(letter)).join('');
    // Fill separators when the next letter arrives; deleting back across a separator
    // must not immediately insert it again or trap the Backspace key.
    const spaced = fillWordSpaces(filtered, spellingWord);
    const next = filtered.length < typed.length ? spaced.trimEnd() : spaced;
    const attempt = countTypingAttempt(typed.replace(/\s/g, ''), next.replace(/\s/g, ''), spellingWord.replace(/\s/g, ''));
    if (attempt.input > 0) {
      setTypingStats((previous) => ({
        input: previous.input + attempt.input,
        correct: previous.correct + attempt.correct,
      }));
    }
    const clean = next.slice(0, spellingWord.length);
    if (clean && isCorrectWord(clean, spellingWord)) {
      completedRef.current = true;
      setCompleted(true);
      setTyped(spellingWord);
      setError('');
      setRevealedLetters(0);
      const remainingReviews = reviewOrder?.filter((index) => index !== currentIndex && !reviewedIndices.includes(index));
      if (reviewOrder !== null) setReviewedIndices((indices) => indices.includes(currentIndex) ? indices : [...indices, currentIndex]);
      if (reviewOrder === null && nextIndex === undefined) setSummaryDismissed(false);
      // Save immediately, but keep the completed word visible before advancing.
      const attempt = attempts.current[currentIndex];
      onCorrect(currentWord.name, currentIndex, { perfect: !attempt?.mistake && !attempt?.hint, review: reviewOrder !== null });
      onSpeak(currentWord.name);
      const advanceIndex = remainingReviews ? remainingReviews[0] : nextIndex;
      if (advanceIndex !== undefined) {
        advanceTimer.current = setTimeout(() => {
          advanceTimer.current = null;
          moveTo(advanceIndex);
        }, 800);
      }
      return;
    }
    if (clean && !isCorrectPrefix(clean, spellingWord) && !error) {
      if (!attempts.current[currentIndex]?.mistake) onMistake(currentWord.name);
      attempts.current[currentIndex] = { ...attempts.current[currentIndex], mistake: true };
    }
    setTyped(clean);
    setError(clean && !isCorrectPrefix(clean, spellingWord)
      ? '拼写不正确，按 Backspace 修改后继续。'
      : '');
  }

  function skipCurrent() {
    const target = reviewOrder?.find((index) => index !== currentIndex && !reviewedIndices.includes(index)) ?? nextIndex;
    if (target !== undefined) moveTo(target);
  }

  function startPractice() {
    setReviewOrder(null);
    setReviewedIndices([]);
    setSummaryDismissed(true);
    moveTo(practiceOrder[0]);
  }

  function startReview() {
    const mistakes = new Set(progress.mistakeWords ?? []);
    const indices = practiceOrder.filter((index) => mistakes.has(words[index].name));
    cancelAdvance();
    setReviewOrder(indices);
    setReviewedIndices([]);
    setSummaryDismissed(true);
    if (indices.length > 0) moveTo(indices[0]);
  }

  const canSkip = reviewOrder !== null
    ? reviewOrder.some((index) => index !== currentIndex && !reviewedIndices.includes(index))
    : nextIndex !== undefined;

  function revealHint() {
    if (completedRef.current || revealedLetters >= spellingWord.length) return;
    attempts.current[currentIndex] = { ...attempts.current[currentIndex], hint: true };
    setRevealedLetters((count) => nextHintLength(typed, spellingWord, count));
  }
  usePracticeShortcuts({
    listen: () => onSpeak(currentWord.name),
    hint: settingsReady && hintsEnabled && !completed && revealedLetters < spellingWord.length ? revealHint : undefined,
    skip: canSkip ? skipCurrent : undefined,
    enabled: !showMastery && !reviewFinished,
  });

  const phonetic = pronunciationType === '1' ? currentWord.ukphone : currentWord.usphone;

  return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8">
      <div className="flex min-h-full w-full flex-col">
        {reviewFinished ? (
          <section className="end-state my-auto flex !h-auto shrink-0 flex-col items-center justify-center text-center" role="status" aria-live="polite">
            <h2 className="text-[32px] font-extrabold text-ink">{reviewOrder.length ? '错题复习完成！' : '暂时没有错题'}</h2>
            <p className="mt-4 text-[#475569]">{reviewOrder.length ? `已复习本轮 ${reviewOrder.length} 个错词。` : '拼写出错的单词会自动记录在当前题库，方便下次复习。'}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {reviewOrder.length > 0 && <Button type="button" className="primary-button" onClick={startReview}>再复习一轮</Button>}
              <Button type="button" variant="secondary" className="secondary-button" onClick={startPractice}>返回单词练习</Button>
            </div>
          </section>
        ) : showMastery ? (
          <MasteryPanel kind="word" listLabel={listLabel} total={words.length} typingStats={typingStats} onReplay={startPractice} onReview={startReview} />
        ) : (
        <ExercisePrompt
          progressItems={reviewOrder === null ? progressItems : reviewOrder.map((index) => ({ ...progressItems[index], completed: reviewedIndices.includes(index) }))}
          progress={reviewOrder === null ? knownWords.size : reviewedIndices.length}
          total={order.length}
          progressDetails={<TypingStatistics {...typingStats} />}
          navigation={
            <PracticeNavigation kind="word" meaning={shortMeaning} review={reviewOrder !== null}
              previous={previousWord ? { label: previousWord.name, onSelect: () => moveTo(previousIndex!) } : undefined}
              next={nextWord ? { label: nextWord.name, onSelect: () => moveTo(nextIndex!) } : undefined}>
                {hasMoreMeanings && (
                <details key={currentIndex} className="group mx-auto mb-2 w-full max-w-2xl shrink-0">
                  <summary className="mx-auto w-fit cursor-pointer list-none rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#2563eb] hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#93c5fd] [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">展开完整释义</span>
                    <span className="hidden group-open:inline">收起完整释义</span>
                    <ChevronRight size={13} className="ml-1 inline-block rotate-90 transition-transform group-open:-rotate-90 motion-reduce:transition-none" />
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-left text-[14px] leading-7 text-[#334155]">
                    {currentWord.trans.map((meaning, index) => (
                      <li key={index} className="flex gap-3">
                        <span aria-hidden="true" className="shrink-0 tabular-nums text-[#94a3b8]">{index + 1}.</span>
                        <span className="min-w-0 break-words">{meaning}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </PracticeNavigation>
          }

        >
          <PracticeSpellingBoard
            words={[spellingWord]}
            phonetics={[phonetic ? `/${phonetic}/` : '']}
            activeIndex={0}
            typed={typed}
            revealedLetters={hintsEnabled ? revealedLetters : 0}
            completedIndices={completed ? [0] : []}
            error={error}
            focusSignal={currentIndex}
            label="根据中文释义拼写英文单词"
            onChange={changeTyped}
            onSpeakWord={onSpeak}
          />
          <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${error ? 'text-orange-600' : completed ? 'text-emerald-600' : 'text-[#64748b]'}`}>
            {completed ? (nextWord ? '拼写正确！即将进入下一个单词…' : '拼写正确！已完成最后一个单词') : error ? '' : '根据中文释义拼写英文单词，拼对后稍作停留再进入下一词'}
          </div>
          <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onSpeak(currentWord.name)} aria-keyshortcuts="Alt+p" className="text-action h-auto"><Volume2 size={17} /> 听当前单词 <ShortcutHint letter="P" /></Button>
            {settingsReady && hintsEnabled && <Button type="button" variant="ghost" aria-keyshortcuts="Alt+h" onClick={revealHint} disabled={completed || revealedLetters >= spellingWord.length} className="text-action h-auto"><Lightbulb size={17} /> 多给一个字母 <ShortcutHint letter="H" /></Button>}
            <Button type="button" variant="ghost" aria-keyshortcuts="Alt+n" onClick={skipCurrent} disabled={!canSkip} className="text-action h-auto"><SkipForward size={17} /> 跳过当前词 <ShortcutHint letter="N" /></Button>
            <Button type="button" variant="ghost" onClick={reviewOrder === null ? startReview : startPractice} className="text-action h-auto">{reviewOrder === null ? '复习错题' : '返回单词练习'}</Button>
          </div>
        </ExercisePrompt>
        )}
        {!showMastery && !reviewFinished && (
          <div className="shrink-0 pt-5 text-center text-[12px] font-medium text-[#64748b]">
            直接敲键盘，拼对自动通过 · <kbd>{keyLabel('Backspace')}</kbd> 删除 · <kbd>{keyLabel('Esc')}</kbd> 清空
          </div>
        )}
      </div>
    </div>
  );
}
