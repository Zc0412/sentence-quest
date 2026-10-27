'use client';

import { useKeyboardPlatform } from '@/hooks/useKeyboardPlatform';
import { ShortcutHint } from './ShortcutHint';

import { usePracticeSettings } from './PracticeSettingsProvider';

import { useMemo } from 'react';
import { Lightbulb, SkipForward, Volume2 } from 'lucide-react';
import { PracticeNavigation } from './PracticeNavigation';
import { TypingStatistics } from './TypingStatistics';
import type { SentenceGame } from '@/hooks/useSentenceGame';
import type { Sentence } from '@/types/game';
import { ExercisePrompt } from './ExercisePrompt';
import { PracticeSpellingBoard } from './PracticeSpellingBoard';
import { Button } from './ui/button';

interface Props {
  game: SentenceGame;
  sentenceList: Sentence[];
  typingStats: { input: number; correct: number };
  onChangeTyped: (value: string) => void;
}

export function PhrasePracticeModule({ game, sentenceList, typingStats, onChangeTyped }: Props) {
  const { hintsEnabled, ready: settingsReady } = usePracticeSettings();
  const { keyLabel } = useKeyboardPlatform();
  const progressItems = useMemo(() => {
    const completed = new Set(game.progress.completedIds);
    return sentenceList.map((sentence) => ({ id: sentence.id, text: sentence.english, meaning: sentence.zh, completed: completed.has(sentence.id) }));
  }, [sentenceList, game.progress.completedIds]);
  const sentence = game.sentence;
  const previousSentence = sentenceList[game.courseIndex - 1];
  const nextSentence = sentenceList[game.courseIndex + 1];

  return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8">
      <div className="flex min-h-full w-full flex-col">
        <ExercisePrompt
          progressItems={progressItems}
          progress={game.completedCount}
          total={sentenceList.length}
          progressItemLabel="个短语"
          progressDetails={<TypingStatistics {...typingStats} />}
          navigation={
            <PracticeNavigation kind="phrase" meaning={sentence.zh}
              previous={previousSentence ? { label: previousSentence.zh, onSelect: () => game.selectSentence(previousSentence.id) } : undefined}
              next={nextSentence ? { label: nextSentence.zh, onSelect: () => game.selectSentence(nextSentence.id) } : undefined} />
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
            onChange={onChangeTyped}
            onSpeakWord={game.speakWord}
            label="根据中文释义拼写英文短语"
          />
          <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${game.error ? 'text-orange-600' : 'text-[#64748b]'}`}>
            {game.error || '根据中文释义拼写英文短语，拼对当前单词后自动进入下一词'}
          </div>
          <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" onClick={() => game.speakWord(game.currentWord)} aria-keyshortcuts="Alt+p" className="text-action h-auto"><Volume2 size={17} /> 听当前单词 <ShortcutHint letter="P" /></Button>
            {settingsReady && hintsEnabled && <Button type="button" variant="ghost" aria-keyshortcuts="Alt+h" onClick={game.revealHint} disabled={game.revealedLetters >= game.currentWord.length} className="text-action h-auto"><Lightbulb size={17} /> 多给一个字母 <ShortcutHint letter="H" /></Button>}
            <Button type="button" variant="ghost" aria-keyshortcuts="Alt+n" onClick={game.skipSentence} className="text-action h-auto"><SkipForward size={17} /> 跳过当前短语 <ShortcutHint letter="N" /></Button>
          </div>
        </ExercisePrompt>
        <div className="shrink-0 pt-5 text-center text-[12px] font-medium text-[#64748b]">
          点击单词选择输入 · <kbd>{keyLabel('Tab')}</kbd> 下一未完成词 · <kbd>{keyLabel('Shift')} + {keyLabel('Tab')}</kbd> 上一未完成词 · <kbd>{keyLabel('Backspace')}</kbd> 删除 · <kbd>{keyLabel('Esc')}</kbd> 清空
        </div>
      </div>
    </div>
  );
}
