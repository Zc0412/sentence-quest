'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Lightbulb } from 'lucide-react';
import type { MistakeEntry } from '@/types/mistake-notebook';
import type { Progress } from '@/types/game';
import type { ReviewSession } from '@/utils/review-session';
import { loadProgress } from '@/utils/storage';
import { setPronunciationType, stopSpeech, type PronunciationType } from '@/utils/speech';
import { useMistakeNotebook } from './MistakeNotebookProvider';
import { NotebookPractice } from './NotebookPractice';
import { PracticeHeader } from './PracticeHeader';
import { PracticeInstructions } from './PracticeInstructions';
import { ActivityHeatmap } from './ActivityHeatmap';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

export function NotebookReviewApp({ sessionId }: { sessionId: string }) {
  const notebook = useMistakeNotebook();
  const router = useRouter();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [entries, setEntries] = useState<MistakeEntry[] | null>(null);
  const [active, setActive] = useState<MistakeEntry | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [pronunciationType, setAccent] = useState<PronunciationType>('1');
  const [showActivity, setShowActivity] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { readSession } = notebook;
  useEffect(() => {
    setPronunciationType('1');
    let active = true;
    void loadProgress().then((loaded) => { if (active) setProgress(loaded.progress); });
    return () => { active = false; stopSpeech(); };
  }, []);
  useEffect(() => {
    if (!notebook.ready || entries) return;
    const saved = readSession(sessionId);
    if (!saved) { setError('这轮复习已失效，请返回错题本重新选择题目。'); return; }
    const lookup = new Map(notebook.state.entries.map((entry) => [entry.id, entry]));
    const selected = saved.ids.map((id) => lookup.get(id)).filter((entry): entry is MistakeEntry => Boolean(entry));
    if (!selected.length) { setError('这轮错题已不存在，请返回错题本重新选择。'); return; }
    if (selected.some((entry) => entry.kind !== selected[0].kind)) { setError('请分别选择单词或短语开始复习。'); return; }
    setSession(saved); setEntries(selected); setActive(selected[0]);
  }, [notebook.ready, notebook.state.entries, sessionId, readSession, entries]);
  const returnHref = session?.returnHref ?? '/settings?tab=mistakes';
  const exit = () => { stopSpeech(); router.push(returnHref); };
  const isPhrase = active?.kind === 'phrase';
  const label = active ? `${active.sourceLabel}${active.group ? ` · 第 ${active.group} 组` : active.category ? ` · ${active.category}` : ''}` : '错题复习';
  return (
    <div className="app-background viewport-app">
      <div className="pointer-events-none absolute -left-32 top-16 h-[470px] w-[470px] rounded-full bg-[#dbeafe] opacity-55 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-[400px] h-[530px] w-[530px] rounded-full bg-[#ccfbf1] opacity-70 blur-[120px]" />
      <div className="app-shell" inert={showActivity || showInstructions}>
        <PracticeHeader settingsHref={returnHref} xp={progress?.xp ?? 0} pronunciationType={pronunciationType}
          onShowActivity={() => setShowActivity(true)} onPronunciationChange={(type) => { setAccent(type); setPronunciationType(type); }} />
        <main className="app-main app-main-practice">
          <section className="exercise-section">
            <div className="exercise-toolbar flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#64748b]">
                <span className="shrink-0">{active ? `${isPhrase ? '短语' : '单词'}错题复习` : '错题复习'}</span><span aria-hidden="true">/</span>
                <button type="button" onClick={exit} className="truncate font-bold text-[#0f172a] hover:text-[#2563eb]" title="返回错题本">{label}</button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" onClick={exit} className="text-action h-auto text-[13px]"><ArrowLeft size={15} /><span className="hidden sm:inline">返回错题本</span></Button>
                <Button type="button" variant="ghost" onClick={() => setShowInstructions(true)} className="flex h-auto items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#2563eb] hover:bg-white/70"><Lightbulb size={16} />玩法说明</Button>
              </div>
            </div>
            <Card className="game-card" aria-busy={!entries && !error}>
              {entries ? <NotebookPractice entries={entries} onExit={exit} onEntryChange={setActive} controlsEnabled={!showActivity && !showInstructions} /> :
                <div className="end-state flex flex-col items-center justify-center gap-3 text-center" role={error ? 'alert' : 'status'} aria-live="polite">
                  {!error && <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#dbeafe] border-t-[#3b82f6]" />}
                  <p className="text-sm font-semibold text-[#475569]">{error || '正在恢复错题复习…'}</p>
                  {error && <Button type="button" onClick={exit}>返回错题本</Button>}
                </div>}
            </Card>
            <p className="storage-status text-center text-[12px] leading-5 text-[#64748b]">{notebook.warning ? <span role="alert" className="font-semibold text-orange-700">{notebook.warning}</span> : '复习记录自动保存在当前浏览器中'}</p>
          </section>
        </main>
      </div>
      <Dialog open={showActivity} onOpenChange={setShowActivity}><DialogContent className="modal-content activity-modal-content">
        <div className="modal-icon"><CalendarDays size={23} /></div><DialogTitle className="mt-4 text-[23px] font-black text-ink">学习热力图</DialogTitle>
        <DialogDescription className="mb-5 mt-2 text-sm leading-6 text-[#64748b]">记录每天完成练习的单词与句子，帮助你持续积累。</DialogDescription>
        <ActivityHeatmap activityByDate={progress?.activityByDate ?? {}} />
      </DialogContent></Dialog>
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}><PracticeInstructions mode={isPhrase ? 'sentence' : 'word'} onStart={() => setShowInstructions(false)} /></Dialog>
    </div>
  );
}
