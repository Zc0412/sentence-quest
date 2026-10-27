'use client';

import { useEffect, useRef, useState } from 'react';
import { Lightbulb, SkipForward, Volume2 } from 'lucide-react';
import type { MistakeEntry } from '@/types/mistake-notebook';
import { useMistakeNotebook } from './MistakeNotebookProvider';
import { useLearningHistory } from './LearningHistoryProvider';
import { usePracticeSettings } from './PracticeSettingsProvider';
import { usePracticeShortcuts } from '@/hooks/usePracticeShortcuts';
import { countTypingAttempt } from '@/utils/typingStats';
import { fillWordSpaces, isCorrectPrefix, isCorrectWord, nextHintLength } from '@/utils/validator';
import { speakWord, stopSpeech } from '@/utils/speech';
import { PracticeSpellingBoard } from './PracticeSpellingBoard';
import { CompletionPanel } from './CompletionPanel';
import { ExercisePrompt } from './ExercisePrompt';
import { PracticeNavigation } from './PracticeNavigation';
import { TypingStatistics } from './TypingStatistics';
import { MasteryPanel } from './MasteryPanel';
import { useKeyboardPlatform } from '@/hooks/useKeyboardPlatform';
import { ShortcutHint } from './ShortcutHint';
import { Button } from './ui/button';

export interface NotebookResult { id: string; perfect: boolean; skipped: boolean; input: number; correct: number }
interface Props { entries: MistakeEntry[]; onExit: () => void; onEntryChange?: (entry: MistakeEntry) => void; controlsEnabled?: boolean }

export function NotebookPractice({ entries, onExit, onEntryChange, controlsEnabled = true }: Props) {
  const notebook = useMistakeNotebook();
  const [position, setPosition] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<NotebookResult[]>([]);
  const [stats, setStats] = useState({ input: 0, correct: 0 });
  const [queue, setQueue] = useState(entries);
  const finished = position >= queue.length;
  const remaining = queue.filter((entry) => { const result = results.find((item) => item.id === entry.id); return !result || !result.perfect || result.skipped; });
  const record = (result: NotebookResult) => setResults((old) => [...old.filter((entry) => entry.id !== result.id), result]);
  useEffect(() => { if (queue[position]) onEntryChange?.(queue[position]); }, [queue, position, onEntryChange]);
  const progressItems = queue.map((entry) => ({ id: entry.id, text: entry.english, meaning: entry.meaning, completed: results.some((result) => result.id === entry.id && !result.skipped) }));
  const restart = (next: MistakeEntry[]) => { setQueue(next); setResults([]); setStats({ input: 0, correct: 0 }); setPosition(0); setAttempt((value) => value + 1); };
  if (finished) return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8"><div className="flex min-h-full w-full flex-col">
      <MasteryPanel kind={queue[0].kind} listLabel="错题复习" total={results.filter((item) => !item.skipped).length} typingStats={stats}
        reviewSummary={queue.filter((entry) => notebook.state.entries.some((item) => item.id === entry.id && item.status === 'consolidated')).length}
        onReplay={() => restart(queue)} onReview={remaining.length ? () => restart(remaining) : undefined} saved={!notebook.warning}
        extraAction={<Button type="button" variant="secondary" className="secondary-button" onClick={onExit}>返回错题本</Button>} />
    </div></div>
  );
  return (
    <div className="vocabulary-exercise h-full min-h-0 overflow-y-auto px-2 py-3 sm:px-8"><div className="flex min-h-full w-full flex-col">
      <NotebookQuestion key={`${attempt}:${position}:${queue[position].id}`} entry={queue[position]}
        onFinish={record} onReplay={() => setAttempt((value) => value + 1)}
        controlsEnabled={controlsEnabled} progressItems={progressItems}
        previous={position > 0 ? { label: queue[position - 1].kind === 'word' ? queue[position - 1].english : queue[position - 1].meaning, onSelect: () => setPosition(position - 1) } : undefined}
        next={position + 1 < queue.length ? { label: queue[position + 1].kind === 'word' ? queue[position + 1].english : queue[position + 1].meaning, onSelect: () => setPosition(position + 1) } : undefined}
        typingStats={stats} onTypingAttempt={(value) => setStats((old) => ({ input: old.input + value.input, correct: old.correct + value.correct }))}
        onNext={() => setPosition(position + 1)}
        onSkip={(result) => { record(result); setPosition(position + 1); }} />
    </div></div>
  );
}

export function NotebookQuestion({ entry, onFinish, onNext, onReplay, onSkip, previous, next, typingStats, onTypingAttempt, progressItems, controlsEnabled = true }: {
  entry: MistakeEntry;
  onFinish: (result: NotebookResult) => void;
  onNext: () => void;
  onReplay: () => void;
  onSkip: (result: NotebookResult) => void;
  previous?: { label: string; onSelect: () => void };
  next?: { label: string; onSelect: () => void };
  typingStats?: { input: number; correct: number };
  onTypingAttempt?: (value: { input: number; correct: number }) => void;
  progressItems?: { id: string; text: string; meaning: string; completed: boolean }[];
  controlsEnabled?: boolean;
}) {
  const notebook = useMistakeNotebook();
  const history = useLearningHistory();
  const { hintsEnabled, ready: settingsReady } = usePracticeSettings();
  const { keyLabel } = useKeyboardPlatform();
  const words = entry.words.map((word) => word.normalize('NFKC').replace(/[“”]/g, '"').replace(/⋯/g, '...').replace(/\s+/g, ' '));
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { typed: string; error: string; revealed: number }>>({});
  const [focus, setFocus] = useState(0);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [stats, setStats] = useState({ input: 0, correct: 0 });
  const mistakeRecorded = useRef(false);
  const completeRef = useRef(false);
  const draft = drafts[index] ?? { typed: '', error: '', revealed: 0 };
  const word = words[index] ?? '';
  useEffect(() => () => stopSpeech(), []);
  function select(target: number) {
    if (finished || target < 0 || target >= words.length || completed.includes(target)) return;
    setIndex(target); setFocus((value) => value + 1);
  }
  function move(direction: number) {
    for (let offset = 1; offset <= words.length; offset += 1) {
      const target = (index + direction * offset + words.length) % words.length;
      if (!completed.includes(target)) { select(target); return; }
    }
  }
  function change(value: string) {
    if (completeRef.current) return;
    const filtered = Array.from(value).filter((letter) => /^[a-zA-Z'’-]$/.test(letter) || word.includes(letter)).join('');
    const spaced = fillWordSpaces(filtered, word);
    const clean = (filtered.length < draft.typed.length ? spaced.trimEnd() : spaced).slice(0, word.length);
    const attempt = countTypingAttempt(draft.typed.replace(/\s/g, ''), clean.replace(/\s/g, ''), word.replace(/\s/g, ''));
    if (attempt.input > 0) onTypingAttempt?.(attempt);
    const nextStats = { input: stats.input + attempt.input, correct: stats.correct + attempt.correct };
    setStats(nextStats);
    if (clean && isCorrectWord(clean, word)) {
      const passed = [...completed, index];
      setCompleted(passed);
      setDrafts((old) => ({ ...old, [index]: { typed: word, error: '', revealed: 0 } }));
      history.record('word', word, entry.kind === 'word' ? entry.meaning : entry.sentence?.annotations[index]?.meaning ?? '');
      if (passed.length === words.length) {
        completeRef.current = true;
        setFinished(true);
        const perfect = !mistakeRecorded.current && hints === 0;
        notebook.review(entry.id, perfect);
        if (entry.kind === 'phrase') history.record('sentence', entry.english, entry.meaning);
        onFinish({ id: entry.id, perfect, skipped: false, ...nextStats });
        speakWord(entry.english);
      } else {
        const next = words.findIndex((_, target) => !passed.includes(target));
        setIndex(next); setFocus((value) => value + 1); speakWord(word);
      }
      return;
    }
    const wrong = Boolean(clean) && !isCorrectPrefix(clean, word);
    if (wrong && !draft.error) {
      setMistakes((value) => value + 1);
      if (!mistakeRecorded.current) { mistakeRecorded.current = true; notebook.record(entry); }
    }
    setDrafts((old) => ({ ...old, [index]: { ...draft, typed: clean, error: wrong ? '拼写不正确，按 Backspace 修改后继续。' : '' } }));
  }
  function hint() {
    if (finished || draft.revealed >= word.length) return;
    setHints((value) => value + 1);
    setDrafts((old) => ({ ...old, [index]: { ...draft, revealed: nextHintLength(draft.typed, word, draft.revealed) } }));
    setFocus((value) => value + 1);
  }
  const skip = () => onSkip({ id: entry.id, perfect: false, skipped: true, ...stats });
  usePracticeShortcuts({ enabled: !finished && controlsEnabled, listen: () => speakWord(word), hint: settingsReady && hintsEnabled ? hint : undefined, skip });
  useEffect(() => {
    if (!finished || entry.kind !== 'word' || !controlsEnabled) return;
    const timer = setTimeout(onNext, 800);
    return () => clearTimeout(timer);
  }, [finished, entry.kind, onNext, controlsEnabled]);

  if (finished && entry.sentence) return <div className="completion-container phrase-completion-container"><CompletionPanel sentence={entry.sentence} earnedXp={0} mistakes={mistakes} hints={hints} onNext={onNext} onReplay={onReplay} shortcutsEnabled={controlsEnabled} /></div>;
  const items = progressItems ?? [{ id: entry.id, text: entry.english, meaning: entry.meaning, completed: finished }];
  const meaning = entry.kind === 'word' && entry.meaning.length > 48 ? `${entry.meaning.slice(0, 48)}…` : entry.meaning;
  return (
    <>
      <ExercisePrompt progressItems={items} progress={items.filter((item) => item.completed).length} total={items.length} progressItemLabel={entry.kind === 'word' ? '个单词' : '个短语'}
        progressDetails={<TypingStatistics {...(typingStats ?? stats)} />}
        navigation={<PracticeNavigation kind={entry.kind} review meaning={meaning} previous={previous} next={next}>
          {meaning !== entry.meaning && <details className="group mx-auto mb-2 w-full max-w-2xl shrink-0"><summary className="mx-auto w-fit cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#2563eb] hover:bg-[#eff6ff]">展开完整释义</summary><p className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-left text-[14px] leading-7 text-[#334155]">{entry.meaning}</p></details>}
        </PracticeNavigation>}>
      <PracticeSpellingBoard words={words} phonetics={entry.phonetics} activeIndex={finished ? words.length : index}
        typed={draft.typed} revealedLetters={hintsEnabled ? draft.revealed : 0} error={draft.error} focusSignal={focus}
        label="错题复习拼写" completedIndices={completed} drafts={drafts} onSelectWord={select} onMoveWord={move} onChange={change} onSpeakWord={speakWord} />
        <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${draft.error ? 'text-orange-600' : finished ? 'text-emerald-600' : 'text-[#64748b]'}`}>{finished ? '拼写正确！即将进入下一题…' : draft.error || (entry.kind === 'word' ? '根据中文释义拼写英文单词，拼对后稍作停留再进入下一词' : '根据中文释义拼写英文短语，拼对当前单词后自动进入下一词')}</div>
        <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="ghost" className="text-action h-auto" aria-keyshortcuts="Alt+p" onClick={() => speakWord(word)}><Volume2 size={17} />听当前单词 <ShortcutHint letter="P" /></Button>
          {settingsReady && hintsEnabled && <Button type="button" variant="ghost" className="text-action h-auto" aria-keyshortcuts="Alt+h" onClick={hint} disabled={finished || draft.revealed >= word.length}><Lightbulb size={17} />多给一个字母 <ShortcutHint letter="H" /></Button>}
          <Button type="button" variant="ghost" className="text-action h-auto" aria-keyshortcuts="Alt+n" onClick={skip} disabled={finished}><SkipForward size={17} />{entry.kind === 'word' ? '跳过当前词' : '跳过当前短语'} <ShortcutHint letter="N" /></Button>
        </div>
      </ExercisePrompt>
      <div className="shrink-0 pt-5 text-center text-[12px] font-medium text-[#64748b]">
        {entry.kind === 'phrase' ? <>点击单词选择输入 · <kbd>{keyLabel('Tab')}</kbd> 下一未完成词 · <kbd>{keyLabel('Shift')} + {keyLabel('Tab')}</kbd> 上一未完成词 · </> : '直接敲键盘，拼对自动通过 · '}
        <kbd>{keyLabel('Backspace')}</kbd> 删除 · <kbd>{keyLabel('Esc')}</kbd> 清空
      </div>
    </>
  );
}
