'use client';

import { PracticeInstructions } from './components/PracticeInstructions';

import { useLearningHistory } from './components/LearningHistoryProvider';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from './components/Logo';
import {
  CalendarDays, Flame, Lightbulb, Settings,
  RotateCcw, Zap,
} from 'lucide-react';
import type { VocabularyWord } from './types/game';
import { vocabularyLists, loadVocabularyWords } from './data/vocabulary';
import type { VocabularyListId } from './data/vocabulary';
import { useSentenceGame } from './hooks/useSentenceGame';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { VocabularyModule } from './components/VocabularyModule';
import { setPronunciationType } from './utils/speech';
import type { PronunciationType } from './utils/speech';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from './components/ui/dialog';

interface Props {
  listId: VocabularyListId;
}

export default function App({ listId }: Props) {
  const game = useSentenceGame();
  const history = useLearningHistory();
  const [words, setWords] = useState<VocabularyWord[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pronunciationType, setSelectedPronunciationType] = useState<PronunciationType>('1');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const vocabularyList = vocabularyLists.find((list) => list.id === listId);
  const listLabel = vocabularyList?.label ?? listId;
  const listProgress = game.progress.vocabularyProgress[listId] ?? { knownWords: [], index: 0 };

  useEffect(() => {
    let cancelled = false;
    setWords(null);
    setLoadError('');
    void loadVocabularyWords(listId)
      .then((loadedWords) => {
        if (!cancelled) setWords(loadedWords);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '词库加载失败，请重试。');
        }
      });
    return () => { cancelled = true; };
  }, [listId, loadAttempt]);

  const ready = game.ready && words !== null;

  return (
    <div className="app-background viewport-app">
      <div className="pointer-events-none absolute -left-32 top-16 h-[470px] w-[470px] rounded-full bg-[#dbeafe] opacity-55 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-[400px] h-[530px] w-[530px] rounded-full bg-[#ccfbf1] opacity-70 blur-[120px]" />
      <div className="app-shell" inert={showInstructions || showReset || showActivity}>
        <header className="app-header flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild type="button" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-[#e2e8f0] bg-white text-[#475569] shadow-sm hover:bg-[#eff6ff]" aria-label="打开设置">
              <Link href={`/settings?listId=${listId}`}><Settings size={18} /></Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowActivity(true)} className="flex h-auto items-center gap-1.5 rounded-2xl border-[#e2e8f0] bg-white px-2.5 py-2.5 text-[12px] font-bold text-[#475569] shadow-sm hover:bg-[#eff6ff] sm:px-3" aria-label="查看学习热力图">
              <CalendarDays size={17} /><span className="hidden sm:inline">学习统计</span>
            </Button>
            <div role="group" aria-label="发音口音" className="flex items-center rounded-2xl border border-[#e2e8f0] bg-white p-1 shadow-sm">
              {([
                ['1', '英音'],
                ['2', '美音'],
              ] as const).map(([type, label]) => (
                <Button
                  key={type}
                  type="button"
                  variant="ghost"
                  aria-pressed={pronunciationType === type}
                  onClick={() => {
                    setSelectedPronunciationType(type);
                    setPronunciationType(type);
                  }}
                  className={`h-auto rounded-xl px-2 py-2 text-[12px] font-bold ${pronunciationType === type ? 'bg-[#dbeafe] text-[#2563eb]' : 'text-[#64748b] hover:text-[#0f172a]'}`}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-white/85 px-3 py-2.5 text-sm font-semibold text-[#475569] shadow-sm sm:flex">
              <Flame size={17} className="text-[#fbbf24]" /> 连对 <span className="text-ink">{game.streak}</span> 词
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-black text-ink shadow-sm">
              <Zap size={17} className="fill-[#fbbf24] text-[#f59e0b]" /> {game.progress.xp} <span className="font-medium text-[#94a3b8]">XP</span>
            </div>
          </div>
        </header>

        <main className="app-main app-main-practice">
          <section className="exercise-section">
            <div className="exercise-toolbar flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#64748b]">
                <span className="shrink-0">单词练习</span>
                <span aria-hidden="true">/</span>
                <Link href={`/settings?listId=${encodeURIComponent(listId)}`} className="truncate font-bold text-[#0f172a] hover:text-[#2563eb]" title="切换词库">{listLabel}</Link>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" onClick={() => setShowReset(true)} disabled={!game.ready} className="reset-action" aria-label="清空全部学习记录"><RotateCcw size={15} /></Button>
                <Button onClick={() => setShowInstructions(true)} variant="ghost" className="flex h-auto items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#2563eb] hover:bg-white/70" type="button"><Lightbulb size={16} />玩法说明</Button>
              </div>
            </div>

            <Card className="game-card" aria-busy={!ready}>
              {ready && words ? (
                <VocabularyModule
                  key={listId}
                  words={words}
                  listLabel={listLabel}
                  progress={listProgress}
                  pronunciationType={pronunciationType}
                  onSelectIndex={(index) => game.setVocabularyIndex(listId, index)}
                  onCorrect={(word, nextIndex) => {
                    game.recordVocabularyCorrect(listId, word, nextIndex);
                    history.record('word', word, words.find((entry) => entry.name === word)?.trans.join('；') ?? '');
                  }}
                  onSpeak={game.speakWord}
                />
              ) : (
                <div className="end-state flex flex-col items-center justify-center gap-3 text-center" role={loadError ? 'alert' : 'status'} aria-live="polite">
                  {loadError ? (
                    <>
                      <p className="font-semibold text-orange-700">词库加载失败：{loadError}</p>
                      <Button type="button" variant="secondary" className="secondary-button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>重新加载词库</Button>
                    </>
                  ) : (
                    <>
                      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#dbeafe] border-t-[#3b82f6]" />
                      <p className="text-sm font-semibold text-[#475569]">{game.ready ? '正在加载词库…' : '正在恢复学习进度…'}</p>
                    </>
                  )}
                </div>
              )}
            </Card>

            <p className="storage-status text-center text-[12px] leading-5 text-[#64748b]">
              {game.storageStatus === 'memory'
                ? <span className="font-semibold text-orange-700" role="alert">IndexedDB 读取或保存失败，当前进度只保存在内存，刷新页面可能丢失本次练习。请检查隐私模式、存储权限或关闭其他同站点标签页。{game.storageWarning ? `（${game.storageWarning}）` : ''}</span>
                : '学习进度自动保存在当前浏览器中'}
            </p>
          </section>
        </main>
      </div>

      <Dialog open={showActivity} onOpenChange={setShowActivity}>
        <DialogContent className="modal-content activity-modal-content">
          <div className="modal-icon"><CalendarDays size={23} /></div>
          <DialogTitle id="activity-title" className="mt-4 text-[23px] font-black text-ink">学习热力图</DialogTitle>
          <DialogDescription className="mb-5 mt-2 text-sm leading-6 text-[#64748b]">记录每天完成练习的单词与句子，帮助你持续积累。</DialogDescription>
          <ActivityHeatmap activityByDate={game.progress.activityByDate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <PracticeInstructions mode="word" onStart={() => setShowInstructions(false)} />
      </Dialog>

      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="modal-content">
          <div className="modal-icon !bg-orange-50 !text-orange-700"><RotateCcw size={23} /></div>
          <DialogTitle id="reset-title" className="mt-4 text-[23px] font-black text-ink">确定清空学习记录？</DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-7 text-[#64748b]">已完成的句子、单词拼写进度、每日学习统计、积分和错题记录都会被删除，且无法恢复。学习轨迹会保留。</DialogDescription>
          <div className="mt-7 flex gap-3">
            <Button variant="secondary" className="secondary-button flex-1" onClick={() => setShowReset(false)}>取消</Button>
            <Button variant="destructive" className="primary-button flex-1 !bg-orange-500 hover:!bg-orange-600" onClick={() => { game.resetProgress(); setShowReset(false); }}>确认清空</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
