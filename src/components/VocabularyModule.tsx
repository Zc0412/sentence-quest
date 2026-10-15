'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import type { VocabularyProgress, VocabularyWord } from '../types/game';
import { ExercisePrompt } from './ExercisePrompt';
import { SpellingSlot } from './SpellingSlot';
import { isCorrectWord } from '../utils/validator';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Props {
  words: VocabularyWord[];
  progress: VocabularyProgress;
  listLabel: string;
  pronunciationType: '1' | '2';
  onSelectIndex: (index: number) => void;
  onCorrect: (word: string, nextIndex: number) => void;
  onSpeak: (word: string) => void;
}

export function VocabularyModule({ words, progress, listLabel, pronunciationType, onSelectIndex, onCorrect, onSpeak }: Props) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [revealedLetters, setRevealedLetters] = useState(0);
  const currentIndex = Math.min(Math.max(progress.index, 0), words.length - 1);
  const currentWord = words[currentIndex];
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
    const clean = value.replace(/\s+/g, '').slice(0, currentWord.name.length);
    if (clean && isCorrectWord(clean, currentWord.name)) {
      setTyped('');
      setError('');
      setRevealedLetters(0);
      onCorrect(currentWord.name, Math.min(currentIndex + 1, words.length - 1));
      onSpeak(currentWord.name);
      return;
    }
    setTyped(clean);
    setError(clean && !currentWord.name.toLocaleLowerCase('en-US').startsWith(clean.toLocaleLowerCase('en-US'))
      ? '拼写不正确，按 Backspace 修改后继续。'
      : '');
  }

  function skipCurrent() {
    if (nextWord) moveTo(currentIndex + 1);
  }

  const phonetic = pronunciationType === '1' ? currentWord.ukphone : currentWord.usphone;

  return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <ExercisePrompt
          badge={listLabel}
          position={`${currentIndex + 1} / ${words.length}`}
          progress={knownWords.size}
          total={words.length}
          promptLabel={<><Sparkles size={15} className="text-[#ae93ec]" /> TYPE THIS WORD</>}
          prompt={currentWord.trans.join('；')}
          description="根据中文释义拼写英文单词，拼对后自动进入下一词"
        >
          <div className="sentence-typing-board" aria-label="根据中文释义拼写英文单词">
            <div className="grammar-group" style={{ '--group-color': '#8a70e4' } as CSSProperties} role="group" aria-label="单词拼写">
              <span className="grammar-group-label">单词</span>
              <div className="grammar-group-words">
                <div className={`annotated-word annotated-word-active ${error ? 'annotated-word-incorrect' : ''}`} style={{ '--word-color': '#8a70e4' } as CSSProperties}>
                  <span className="word-phonetic">{phonetic || ''}</span>
                  <SpellingSlot
                    word={currentWord.name}
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
                  <span className="word-color-line" />
                  <span className="word-meaning">{currentWord.trans.join('；')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="word-counter text-center text-[12px] font-semibold text-[#968da9]">WORD {currentIndex + 1} OF {words.length}</div>
          <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${error ? 'text-rose-500' : 'text-[#a49bb5]'}`}>
            {error || <><span className="sm:hidden">点击单词区域输入，拼对自动进入下一词</span><span className="hidden sm:inline">直接敲键盘，拼对自动通过 · <kbd>Backspace</kbd> 删除 · <kbd>Esc</kbd> 清空</span></>}
          </div>
          <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onSpeak(currentWord.name)} className="text-action h-auto"><Volume2 size={17} /> 听当前单词</Button>
            <Button type="button" variant="ghost" onClick={() => setRevealedLetters((count) => Math.min(currentWord.name.length, count + 1))} disabled={revealedLetters >= currentWord.name.length} className="text-action h-auto"><Lightbulb size={17} /> 多给一个字母</Button>
            <Button type="button" variant="ghost" onClick={skipCurrent} disabled={!nextWord} className="text-action h-auto"><SkipForward size={17} /> 跳过当前词</Button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => moveTo(currentIndex - 1)} disabled={!previousWord} className="text-action h-auto">
              <ChevronLeft size={17}/> {previousWord ? `上一个：${previousWord.name}` : '已经是第一个'}
            </Button>
            <Badge variant="secondary" className={`rounded-full px-3 py-1 text-[11px] font-bold ${knownWords.has(currentWord.name) ? 'border-transparent bg-[#e8f8ef] text-[#2e9c70]' : 'border-transparent bg-[#f7f4fb] text-[#a29bb2]'}`}>
              {knownWords.has(currentWord.name) ? '已拼对' : '待练习'}
            </Badge>
            <Button type="button" variant="ghost" onClick={() => moveTo(currentIndex + 1)} disabled={!nextWord} className="text-action h-auto">
              {nextWord ? `下一个：${nextWord.name}` : '已经是最后一个'} <ChevronRight size={17}/>
            </Button>
          </div>
        </ExercisePrompt>
      </div>
    </div>
  );
}
