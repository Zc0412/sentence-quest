'use client';

import { usePracticeSettings } from './PracticeSettingsProvider';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import type { SentenceGame } from '@/hooks/useSentenceGame';
import type { Sentence } from '@/types/game';
import { countTypingAttempt } from '@/utils/typingStats';
import { ExercisePrompt } from './ExercisePrompt';
import { PracticeSpellingBoard } from './PracticeSpellingBoard';
import { Button } from './ui/button';

interface Props {
  game: SentenceGame;
  sentenceList: Sentence[];
}

export function PhrasePracticeModule({ game, sentenceList }: Props) {
  const { hintsEnabled, ready: settingsReady } = usePracticeSettings();
  const [typingStats, setTypingStats] = useState({ input: 0, correct: 0 });
  const sentence = game.sentence;
  const previousSentence = sentenceList[game.courseIndex - 1];
  const nextSentence = sentenceList[game.courseIndex + 1];

  function changeTyped(value: string) {
    const attempt = countTypingAttempt(game.typed, value, game.currentWord);
    if (attempt.input > 0) {
      setTypingStats((previous) => ({
        input: previous.input + attempt.input,
        correct: previous.correct + attempt.correct,
      }));
    }
    game.changeTyped(value);
  }

  return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8">
      <div className="flex min-h-full w-full flex-col">
        <ExercisePrompt
          progress={game.completedCount}
          total={sentenceList.length}
          progressItemLabel="个短语"
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
              <Button type="button" variant="ghost" onClick={() => previousSentence && game.selectSentence(previousSentence.id)} disabled={!previousSentence} className="text-action h-auto min-w-0 w-fit max-w-full justify-self-start justify-start px-0 sm:max-w-48 sm:px-2">
                <ChevronLeft size={17} className="shrink-0" /> <span className="truncate">{previousSentence ? `上一个：${previousSentence.zh}` : '已经是第一个'}</span>
              </Button>
              <div className="min-w-0 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
                  <Sparkles size={15} className="text-[#fbbf24]" /> TYPE THIS PHRASE
                </div>
                <h1 className="break-words text-base font-bold leading-relaxed text-ink sm:text-2xl">{sentence.zh}</h1>
              </div>
              <Button type="button" variant="ghost" onClick={() => nextSentence && game.selectSentence(nextSentence.id)} disabled={!nextSentence} className="text-action h-auto min-w-0 w-fit max-w-full justify-self-end justify-end px-0 sm:max-w-48 sm:px-2">
                <span className="truncate">{nextSentence ? `下一个：${nextSentence.zh}` : '已经是最后一个'}</span> <ChevronRight size={17} className="shrink-0" />
              </Button>
            </div>
          }
        >
          <PracticeSpellingBoard
            words={sentence.words}
            phonetics={sentence.annotations.map((annotation) => annotation.phonetic)}
            activeIndex={game.wordIndex}
            completedIndices={game.completedWordIndices}
            drafts={game.wordDrafts}
            onSelectWord={game.selectWord}
            onMoveWord={game.moveWord}
            revealedLetters={hintsEnabled ? game.revealedLetters : 0}
            typed={game.typed}
            error={game.error}
            focusSignal={game.focusSignal}
            onChange={changeTyped}
            onSpeakWord={game.speakWord}
            label="根据中文释义拼写英文短语"
          />
          <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${game.error ? 'text-orange-600' : 'text-[#64748b]'}`}>
            {game.error || '根据中文释义拼写英文短语，拼对当前单词后自动进入下一词'}
          </div>
          <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" onClick={() => game.speakWord(game.currentWord)} aria-keyshortcuts="Alt+p" className="text-action h-auto"><Volume2 size={17} /> 听当前单词</Button>
            {settingsReady && hintsEnabled && <Button type="button" variant="ghost" onClick={game.revealHint} disabled={game.revealedLetters >= game.currentWord.length} className="text-action h-auto"><Lightbulb size={17} /> 多给一个字母</Button>}
            <Button type="button" variant="ghost" onClick={game.skipSentence} className="text-action h-auto"><SkipForward size={17} /> 跳过当前短语</Button>
          </div>
        </ExercisePrompt>
        <div className="shrink-0 pt-5 text-center text-[12px] font-medium text-[#64748b]">
          点击单词选择输入 · <kbd>Tab</kbd> 下一未完成词 · <kbd>Shift + Tab</kbd> 上一未完成词 · <kbd>Backspace</kbd> 删除 · <kbd>Esc</kbd> 清空
        </div>
      </div>
    </div>
  );
}
