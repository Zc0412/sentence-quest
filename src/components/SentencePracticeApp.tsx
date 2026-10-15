'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, BookOpenText, CalendarDays, Flame, Lightbulb, RotateCcw,
  Settings, SkipForward, Sparkles, Trophy, Volume2, Zap,
} from 'lucide-react';
import { useSentenceGame } from '@/hooks/useSentenceGame';
import { sentences } from '@/data';
import type { Sentence } from '@/types/game';
import { ActivityHeatmap } from './ActivityHeatmap';
import { CompletionPanel } from './CompletionPanel';
import { PhrasePracticeModule } from './PhrasePracticeModule';
import { ProgressBar } from './ProgressBar';
import { WordSlots } from './WordSlots';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from './ui/dialog';
import { setPronunciationType } from '@/utils/speech';
import type { PronunciationType } from '@/utils/speech';

export function SentencePracticeApp({
  sentenceList = sentences,
  title = '句子练习',
  allowReset = true,
  isPhrasePractice = false,
}: {
  sentenceList?: Sentence[];
  title?: string;
  allowReset?: boolean;
  isPhrasePractice?: boolean;
}) {
  const game = useSentenceGame(sentenceList);
  const [pronunciationType, setSelectedPronunciationType] = useState<PronunciationType>('1');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const isPlaying = game.ready && game.phase === 'playing';
  const isFinished = game.ready && game.phase === 'success';

  return (
    <div className="app-background viewport-app">
      <div className="pointer-events-none absolute -left-32 top-16 h-[470px] w-[470px] rounded-full bg-[#dbeafe] opacity-55 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-[400px] h-[530px] w-[530px] rounded-full bg-[#ccfbf1] opacity-70 blur-[120px]" />
      <div className="app-shell" inert={showInstructions || showReset || showActivity}>
        <header className="app-header flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/sentleap-logo.png" alt="句跃 SentLeap" width={2172} height={724} priority className="h-10 w-auto shrink-0" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild type="button" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-[#e2e8f0] bg-white text-[#475569] shadow-sm hover:bg-[#eff6ff]" aria-label="单词练习">
              <Link href="/practice/CET4_T"><BookOpenText size={18} /></Link>
            </Button>
            <Button asChild type="button" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-[#e2e8f0] bg-white text-[#475569] shadow-sm hover:bg-[#eff6ff]" aria-label="打开设置">
              <Link href="/settings?listId=CET4_T"><Settings size={18} /></Link>
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
                <span className="shrink-0">{isPhrasePractice ? '短语练习' : '句子练习'}</span>
                <span aria-hidden="true">/</span>
                {isPhrasePractice
                  ? <Link href="/settings?listId=CET4_T" className="truncate font-bold text-[#0f172a] hover:text-[#2563eb]" title="切换练习">{title}</Link>
                  : <span className="truncate font-bold text-[#0f172a]">{game.mode === 'review' ? '错题复习' : `第 ${game.courseIndex + 1} 题`}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {(allowReset || isPhrasePractice) && <Button type="button" variant="ghost" onClick={() => setShowReset(true)} disabled={!game.ready} className="reset-action" aria-label={isPhrasePractice ? '清空当前题库学习记录' : '清空全部学习记录'}><RotateCcw size={15} /></Button>}
                <Button type="button" variant="ghost" onClick={() => setShowInstructions(true)} className="flex h-auto items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#2563eb] hover:bg-white/70"><Lightbulb size={16} />玩法说明</Button>
              </div>
            </div>
            <Card className="game-card" aria-busy={!game.ready}>
              {!game.ready && (
                <div className="end-state flex flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite">
                  <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#dbeafe] border-t-[#3b82f6]" />
                  <p className="text-sm font-semibold text-[#475569]">正在恢复学习进度…</p>
                </div>
              )}
              {isPlaying && isPhrasePractice && <PhrasePracticeModule game={game} sentenceList={sentenceList} />}
              {isPlaying && !isPhrasePractice && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#dbeafe] px-3.5 py-1.5 text-[11px] font-black tracking-[0.12em] text-[#2563eb]">{game.mode === 'review' ? 'REVIEW MODE' : title.toUpperCase()}</span>
                      <Button type="button" variant="ghost" onClick={() => game.changeMode(game.mode === 'review' ? 'challenge' : 'review')} className="h-auto px-2 py-1 text-xs font-semibold text-[#2563eb]">
                        {game.mode === 'review' ? '返回闯关' : `错题复习${game.reviewCount ? ` (${game.reviewCount})` : ''}`}
                      </Button>
                    </div>
                    <span className="text-[13px] font-bold text-[#64748b]">{game.mode === 'review' ? '重温难点' : `${game.courseIndex + 1} / ${sentenceList.length}`}</span>
                  </div>
                  <div className="mt-4"><ProgressBar value={game.wordIndex} total={game.sentence.words.length} /></div>
                  <div className="sentence-prompt text-center">
                    <div className="mb-4 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#64748b]"><Sparkles size={15} className="text-[#fbbf24}" /> TRANSLATE THIS SENTENCE</div>
                    <h1 className="text-[27px] font-extrabold leading-[1.55] tracking-tight text-ink sm:text-[36px]">{game.sentence.zh}</h1>
                    <p className="mt-4 text-[14px] text-[#64748b]">直接敲键盘开始输入，拼对自动进入下一词</p>
                  </div>
                  <WordSlots
                    sentence={game.sentence}
                    index={game.wordIndex}
                    revealedLetters={game.revealedLetters}
                    typed={game.typed}
                    error={game.error}
                    focusSignal={game.focusSignal}
                    onChange={game.changeTyped}
                    onSpeakWord={game.speakWord}
                  />
                  <div className="word-counter text-center text-[12px] font-semibold text-[#64748b]">WORD {game.wordIndex + 1} OF {game.sentence.words.length}</div>
                  <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${game.error ? 'text-orange-700' : 'text-[#64748b]'}`}>
                    {game.error || <><span className="sm:hidden">点击高亮单词输入，拼对自动进入下一词</span><span className="hidden sm:inline">直接敲键盘，拼对自动通过 · <kbd>Backspace</kbd> 删除 · <kbd>Esc</kbd> 清空</span></>}
                  </div>
                  <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => game.speakWord(game.currentWord)} className="text-action h-auto"><Volume2 size={17} />听当前单词</Button>
                    <Button type="button" variant="ghost" onClick={game.revealHint} disabled={game.revealedLetters >= game.currentWord.length} className="text-action h-auto"><Lightbulb size={17} />多给一个字母</Button>
                    <Button type="button" variant="ghost" onClick={game.skipSentence} className="text-action h-auto"><SkipForward size={17} />跳过这句</Button>
                  </div>
                </>
              )}
              {isFinished && (
                <div className="completion-container">
                  <CompletionPanel sentence={game.sentence} earnedXp={game.earnedXp} mistakes={game.mistakesThisSentence} hints={game.hintsThisSentence} onNext={game.nextSentence} onReplay={game.restartSentence} />
                </div>
              )}
              {game.ready && game.phase === 'allDone' && (
                <div className="end-state flex flex-col items-center justify-center text-center">
                  <div className="mb-7 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#fef3c7] text-[#f59e0b]"><Trophy size={51} /></div>
                  <span className="section-overline text-[#b45309]">ALL SENTENCES CLEARED</span>
                  <h2 className="mt-3 text-[32px] font-extrabold text-ink sm:text-[38px]">句子全部通关！</h2>
                  <p className="mt-4 max-w-md leading-7 text-[#475569]">你完成了全部 {sentenceList.length} 道题，可以重复练习巩固记忆，或复习曾经出错的题目。</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button type="button" className="primary-button" onClick={game.replayCourse}><RotateCcw size={18} />重新练习</Button>
                    <Button type="button" variant="secondary" className="secondary-button" onClick={() => game.changeMode('review')}><BookOpen size={18} />复习错题</Button>
                  </div>
                </div>
              )}
              {game.ready && game.phase === 'reviewDone' && (
                <div className="end-state flex flex-col items-center justify-center text-center">
                  <div className="mb-7 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#dcfce7] text-[#16a34a]"><Trophy size={50} /></div>
                  <span className="section-overline text-[#16a34a]">REVIEW COMPLETE</span>
                  <h2 className="mt-3 text-[32px] font-extrabold text-ink">错题复习完成！</h2>
                  <p className="mt-4 max-w-md leading-7 text-[#475569]">你已经重温了本轮全部错题，可以再复习一轮或继续闯关。</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button type="button" variant="secondary" className="secondary-button" onClick={() => game.changeMode('review')}><RotateCcw size={18} />再复习一轮</Button>
                    <Button type="button" className="primary-button" onClick={() => game.changeMode('challenge')}>继续闯关<ArrowRight size={18} /></Button>
                  </div>
                </div>
              )}
              {game.ready && game.phase === 'noMistakes' && (
                <div className="end-state flex flex-col items-center justify-center text-center">
                  <div className="mb-7 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#dcfce7] text-[#16a34a]"><BookOpen size={50} /></div>
                  <span className="section-overline text-[#16a34a]">LOOKING GOOD</span>
                  <h2 className="mt-3 text-[32px] font-extrabold text-ink">暂时没有错题</h2>
                  <p className="mt-4 max-w-md leading-7 text-[#475569]">做错过的句子会自动出现在这里，随时可以回来巩固学习。</p>
                  <Button type="button" className="primary-button mt-8" onClick={() => game.changeMode('challenge')}>继续句子闯关<ArrowRight size={18} /></Button>
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
        <DialogContent className="modal-content">
          <div className="modal-icon"><Lightbulb size={24} /></div>
          <DialogTitle id="instructions-title" className="mt-4 text-[23px] font-black text-ink">{title}怎么玩？</DialogTitle>
          <div className="mt-5 space-y-4 text-[14px] leading-7 text-[#334155]">
            <p><strong>① 看中文：</strong>理解句意，回忆合适的英文表达。</p>
            <p><strong>② 逐词输入：</strong>拼对当前单词后自动进入下一词。</p>
            <p><strong>③ 使用提示：</strong>可以逐字显示提示，也可以跳过当前句子。</p>
            <p><strong>④ 完成练习：</strong>答对单词会播放发音，完成句子可获得积分并查看语法说明。</p>
          </div>
          <Button type="button" className="primary-button mt-7 w-full" onClick={() => setShowInstructions(false)}>开始练习<ArrowRight size={18} /></Button>
        </DialogContent>
      </Dialog>

      {(allowReset || isPhrasePractice) && <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="modal-content">
          <div className="modal-icon !bg-orange-50 !text-orange-700"><RotateCcw size={23} /></div>
          <DialogTitle id="reset-title" className="mt-4 text-[23px] font-black text-ink">{isPhrasePractice ? '确定清空当前题库的学习记录？' : '确定清空全部学习记录？'}</DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-7 text-[#64748b]">{isPhrasePractice ? '当前短语题库的完成进度和错题记录将被清除，其他题库和积分不受影响。' : '句子、单词进度、每日学习统计、积分和错题记录都会被删除，且无法恢复。'}</DialogDescription>
          <div className="mt-7 flex gap-3">
            <Button type="button" variant="secondary" className="secondary-button flex-1" onClick={() => setShowReset(false)}>取消</Button>
            <Button type="button" variant="destructive" className="primary-button flex-1 !bg-orange-500 hover:!bg-orange-600" onClick={() => { if (isPhrasePractice) game.resetSentenceListProgress(); else game.resetProgress(); setShowReset(false); }}>确认清空</Button>
          </div>
        </DialogContent>
      </Dialog>}
    </div>
  );
}
