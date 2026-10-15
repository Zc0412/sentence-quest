'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import type { VocabularyProgress, VocabularyWord } from '../types/game';
import { ExercisePrompt } from './ExercisePrompt';
import { SpellingSlot } from './SpellingSlot';
import { isCorrectPrefix, isCorrectWord } from '../utils/validator';
import { Button } from './ui/button';
import { countTypingAttempt } from '../utils/typingStats';

interface Props {
  words: VocabularyWord[];
  progress: VocabularyProgress;
  pronunciationType: '1' | '2';
  onSelectIndex: (index: number) => void;
  onCorrect: (word: string, nextIndex: number) => void;
  onSpeak: (word: string) => void;
}

export function VocabularyModule({ words, progress, pronunciationType, onSelectIndex, onCorrect, onSpeak }: Props) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [revealedLetters, setRevealedLetters] = useState(0);
  const [typingStats, setTypingStats] = useState({ input: 0, correct: 0 });
  const [wordOrder, setWordOrder] = useState<number[] | null>(null);
  const currentIndex = Math.min(Math.max(progress.index, 0), words.length - 1);
  const initialIndex = useRef(currentIndex);
  const order = wordOrder ?? words.map((_, index) => index);
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
    setTyped('');
    setError('');
    setRevealedLetters(0);
  }, [currentIndex]);

  function moveTo(index: number) {
    onSelectIndex(Math.min(Math.max(index, 0), words.length - 1));
    setTyped('');
    setError('');
    setRevealedLetters(0);
  }

  function changeTyped(value: string) {
    const filtered = Array.from(value).filter((letter) => /^[a-zA-Z'’-]$/.test(letter) || spellingWord.includes(letter)).join('');
    const attempt = countTypingAttempt(typed, filtered, spellingWord);
    if (attempt.input > 0) {
      setTypingStats((previous) => ({
        input: previous.input + attempt.input,
        correct: previous.correct + attempt.correct,
      }));
    }
    const clean = filtered.slice(0, spellingWord.length);
    if (clean && isCorrectWord(clean, spellingWord)) {
      setTyped('');
      setError('');
      setRevealedLetters(0);
      onCorrect(currentWord.name, nextIndex ?? currentIndex);
      onSpeak(currentWord.name);
      return;
    }
    setTyped(clean);
    setError(clean && !isCorrectPrefix(clean, spellingWord)
      ? '拼写不正确，按 Backspace 修改后继续。'
      : '');
  }

  function skipCurrent() {
    if (nextIndex !== undefined) moveTo(nextIndex);
  }

  const phonetic = pronunciationType === '1' ? currentWord.ukphone : currentWord.usphone;

  return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8">
      <div className="flex min-h-full w-full flex-col">
        <ExercisePrompt
          progress={knownWords.size}
          total={words.length}
          progressDetails={
            <dl className="grid grid-cols-3 gap-2 px-4 py-5 text-center" aria-label="本次练习字母输入统计">
              <div>
                <dt className="text-[12px] font-medium text-[#64748b]">输入数</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-ink">{typingStats.input}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-[#64748b]">正确数</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-[#22c55e]">{typingStats.correct}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-[#64748b]">正确率</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-[#14b8a6]">{typingStats.input ? `${(typingStats.correct / typingStats.input * 100).toFixed(1)}%` : '—'}</dd>
              </div>
            </dl>
          }
          navigation={
            <div className="-mx-2 mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-2 sm:-mx-8 sm:gap-4">
              <Button type="button" variant="ghost" onClick={() => previousIndex !== undefined && moveTo(previousIndex)} disabled={!previousWord} className="text-action h-auto min-w-0 w-full justify-start px-0 sm:px-2">
                <ChevronLeft size={17} className="shrink-0" /> <span className="truncate">{previousWord ? `上一个：${previousWord.name}` : '已经是第一个'}</span>
              </Button>
              <div className="min-w-0 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
                  <Sparkles size={15} className="text-[#fbbf24]" /> TYPE THIS WORD
                </div>
                <h1 className="break-words text-base font-bold leading-relaxed text-ink sm:text-2xl">{shortMeaning}</h1>
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
              </div>
              <Button type="button" variant="ghost" onClick={() => nextIndex !== undefined && moveTo(nextIndex)} disabled={!nextWord} className="text-action h-auto min-w-0 w-full justify-end px-0 sm:px-2">
                <span className="truncate">{nextWord ? `下一个：${nextWord.name}` : '已经是最后一个'}</span> <ChevronRight size={17} className="shrink-0" />
              </Button>
            </div>
          }

        >
          <div className="sentence-typing-board" aria-label="根据中文释义拼写英文单词">
            <div className="grammar-group vocabulary-grammar-group" style={{ '--group-color': '#3b82f6', '--vocabulary-font-size': `clamp(16px, ${Math.min(12, 125 / spellingWord.length)}vw, 108px)` } as CSSProperties} role="group" aria-label="单词拼写">
              <div className="grammar-group-words">
                <div className={`annotated-word annotated-word-active ${error ? 'annotated-word-incorrect' : ''}`} style={{ '--word-color': '#3b82f6' } as CSSProperties}>
                  <span className="word-phonetic">{phonetic ? `/${phonetic}/` : ''}</span>
                  <SpellingSlot
                    suppressIme
                    word={spellingWord}
                    index={currentIndex}
                    active
                    passed={false}
                    typed={typed}
                    revealedLetters={revealedLetters}
                    error={error}
                    focusSignal={currentIndex}
                    onChange={changeTyped}
                    onSpeakWord={onSpeak}
                  />
                  <span className={`word-color-line ${error ? 'word-color-line-incorrect' : ''}`} />
                </div>
              </div>
            </div>
          </div>
          <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${error ? 'text-orange-600' : 'text-[#64748b]'}`}>
            {error ? '' : '根据中文释义拼写英文单词，拼对后自动进入下一词'}
          </div>
          <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onSpeak(currentWord.name)} className="text-action h-auto"><Volume2 size={17} /> 听当前单词</Button>
            <Button type="button" variant="ghost" onClick={() => setRevealedLetters((count) => Math.min(spellingWord.length, count + 1))} disabled={revealedLetters >= spellingWord.length} className="text-action h-auto"><Lightbulb size={17} /> 多给一个字母</Button>
            <Button type="button" variant="ghost" onClick={skipCurrent} disabled={!nextWord} className="text-action h-auto"><SkipForward size={17} /> 跳过当前词</Button>
          </div>
        </ExercisePrompt>
        <div className="shrink-0 pt-5 text-center text-[12px] font-medium text-[#64748b]">
          直接敲键盘，拼对自动通过 · <kbd>Backspace</kbd> 删除 · <kbd>Esc</kbd> 清空
        </div>
      </div>
    </div>
  );
}
