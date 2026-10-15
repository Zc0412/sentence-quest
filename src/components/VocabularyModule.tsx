'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import type { VocabularyProgress, VocabularyWord } from '../types/game';
import { ExercisePrompt } from './ExercisePrompt';
import { SpellingSlot } from './SpellingSlot';
import { isCorrectPrefix, isCorrectWord } from '../utils/validator';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  const currentIndex = Math.min(Math.max(progress.index, 0), words.length - 1);
  const currentWord = words[currentIndex];
  const spellingWord = currentWord.name.normalize('NFKC').replace(/[“”]/g, '"').replace(/⋯/g, '...').replace(/\s+/g, ' ');
  const previousWord = words[currentIndex - 1];
  const nextWord = words[currentIndex + 1];
  const knownWords = useMemo(() => new Set(progress.knownWords), [progress.knownWords]);
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
      onCorrect(currentWord.name, Math.min(currentIndex + 1, words.length - 1));
      onSpeak(currentWord.name);
      return;
    }
    setTyped(clean);
    setError(clean && !isCorrectPrefix(clean, spellingWord)
      ? '拼写不正确，按 Backspace 修改后继续。'
      : '');
  }

  function skipCurrent() {
    if (nextWord) moveTo(currentIndex + 1);
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
                <dt className="text-[12px] font-medium text-[#a49bb5]">输入数</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-ink">{typingStats.input}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-[#a49bb5]">正确数</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-[#2e9c70]">{typingStats.correct}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-[#a49bb5]">正确率</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-[#8a70e4]">{typingStats.input ? `${(typingStats.correct / typingStats.input * 100).toFixed(1)}%` : '—'}</dd>
              </div>
            </dl>
          }
          navigation={
            <div className="-mx-2 mt-3 flex items-center justify-between gap-1 sm:-mx-8">
              <Button type="button" variant="ghost" onClick={() => moveTo(currentIndex - 1)} disabled={!previousWord} className="text-action h-auto w-auto shrink-0 justify-start px-0 sm:px-2">
                <ChevronLeft size={17} className="shrink-0" /> <span className="truncate">{previousWord ? `上一个：${previousWord.name}` : '已经是第一个'}</span>
              </Button>
              <Badge variant="secondary" className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${knownWords.has(currentWord.name) ? 'border-transparent bg-[#e8f8ef] text-[#2e9c70]' : 'border-transparent bg-[#f7f4fb] text-[#a29bb2]'}`}>
                {knownWords.has(currentWord.name) ? '已拼对' : '待练习'}
              </Badge>
              <Button type="button" variant="ghost" onClick={() => moveTo(currentIndex + 1)} disabled={!nextWord} className="text-action h-auto w-auto shrink-0 justify-end px-0 sm:px-2">
                <span className="truncate">{nextWord ? `下一个：${nextWord.name}` : '已经是最后一个'}</span> <ChevronRight size={17} className="shrink-0" />
              </Button>
            </div>
          }
          promptLabel={<><Sparkles size={15} className="text-[#ae93ec]" /> TYPE THIS WORD</>}
          prompt={currentWord.trans.join('；')}
        >
          <div className="sentence-typing-board" aria-label="根据中文释义拼写英文单词">
            <div className="grammar-group vocabulary-grammar-group" style={{ '--group-color': '#8a70e4', '--vocabulary-font-size': `clamp(16px, ${Math.min(12, 125 / spellingWord.length)}vw, 108px)` } as CSSProperties} role="group" aria-label="单词拼写">
              <div className="grammar-group-words">
                <div className={`annotated-word annotated-word-active ${error ? 'annotated-word-incorrect' : ''}`} style={{ '--word-color': '#8a70e4' } as CSSProperties}>
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
          <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${error ? 'text-rose-500' : 'text-[#a49bb5]'}`}>
            {error ? '' : '根据中文释义拼写英文单词，拼对后自动进入下一词'}
          </div>
          <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onSpeak(currentWord.name)} className="text-action h-auto"><Volume2 size={17} /> 听当前单词</Button>
            <Button type="button" variant="ghost" onClick={() => setRevealedLetters((count) => Math.min(spellingWord.length, count + 1))} disabled={revealedLetters >= spellingWord.length} className="text-action h-auto"><Lightbulb size={17} /> 多给一个字母</Button>
            <Button type="button" variant="ghost" onClick={skipCurrent} disabled={!nextWord} className="text-action h-auto"><SkipForward size={17} /> 跳过当前词</Button>
          </div>
        </ExercisePrompt>
        <div className="shrink-0 pt-5 text-center text-[12px] font-medium text-[#a49bb5]">
          直接敲键盘，拼对自动通过 · <kbd>Backspace</kbd> 删除 · <kbd>Esc</kbd> 清空
        </div>
      </div>
    </div>
  );
}
