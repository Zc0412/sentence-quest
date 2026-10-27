'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, Volume2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MistakeEntry } from '@/types/mistake-notebook';
import { useMistakeNotebook } from '@/components/MistakeNotebookProvider';
import { loadLegacyMistakes } from '@/data/legacy-mistakes';
import { loadProgress } from '@/utils/storage';
import { speakWord, stopSpeech } from '@/utils/speech';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MistakeNotebookPanel() {
  const notebook = useMistakeNotebook();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateRef = useRef(notebook.state);
  stateRef.current = notebook.state;
  const [kind, setKind] = useState<'word' | 'phrase'>(searchParams.get('mistakeKind') === 'phrase' ? 'phrase' : 'word');
  const initialStatus = searchParams.get('mistakeStatus');
  const [status, setStatus] = useState<'pending' | 'consolidated' | 'all'>(initialStatus === 'consolidated' || initialStatus === 'all' ? initialStatus : 'pending');
  const [source, setSource] = useState(searchParams.get('mistakeSource') ?? 'all');
  const [query, setQuery] = useState(searchParams.get('mistakeQuery') ?? '');
  const initialSize = searchParams.get('mistakeRoundSize') ?? '20';
  const [roundSize, setRoundSize] = useState(['10', '20', '50'].includes(initialSize) ? initialSize : '20');
  const [importing, setImporting] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const { importLegacy, ready } = notebook;
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setImporting(true);
    setWarnings([]);
    void (async () => {
      try {
        const loaded = await loadProgress();
        if (!active) return;
        const imported = await loadLegacyMistakes(loaded.progress, stateRef.current);
        if (!active) return;
        await importLegacy(imported.items);
        if (active) setWarnings([...imported.warnings, ...(loaded.persistence === 'memory' ? ['学习进度读取异常，部分旧错题可能尚未导入。'] : [])]);
      } catch { if (active) setWarnings(['旧错题导入失败，请重试。现有错题记录仍保留。']); }
      finally { if (active) setImporting(false); }
    })();
    return () => { active = false; };
  }, [ready, importLegacy, retry]);
  useEffect(() => () => stopSpeech(), []);

  const typedEntries = useMemo(() => notebook.state.entries.filter((entry) => entry.kind === kind), [notebook.state.entries, kind]);
  const sources = useMemo(() => [...new Map(typedEntries.map((entry) => [entry.listId, entry.sourceLabel])).entries()], [typedEntries]);
  const counts = { pending: typedEntries.filter((entry) => entry.status === 'pending').length, consolidated: typedEntries.filter((entry) => entry.status === 'consolidated').length, all: typedEntries.length };
  const filtered = useMemo(() => typedEntries.filter((entry) =>
    (status === 'all' || entry.status === status) && (source === 'all' || entry.listId === source)
    && `${entry.english} ${entry.meaning} ${entry.sourceLabel} ${entry.category ?? ''} ${entry.group ? `第 ${entry.group} 组` : ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => (b.lastErrorAt ?? '').localeCompare(a.lastErrorAt ?? '') || a.english.localeCompare(b.english)), [typedEntries, status, source, query]);
  const pending = filtered.filter((entry) => entry.status === 'pending');
  const visible = filtered.slice(0, page * 40);
  const resetPage = () => setPage(1);
  function startReview(entries: MistakeEntry[]) {
    stopSpeech();
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'mistakes');
    params.set('mistakeKind', kind);
    params.set('mistakeStatus', status);
    params.set('mistakeSource', source);
    params.set('mistakeQuery', query);
    params.set('mistakeRoundSize', roundSize);
    const id = notebook.createSession(entries.map((entry) => entry.id), `/settings?${params.toString()}`);
    router.push(`/review?session=${encodeURIComponent(id)}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {notebook.warning && <p role="alert" className="mb-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-700">{notebook.warning}</p>}
        <div className="mb-4 flex shrink-0 items-start gap-3">
          <div><h1 className="text-2xl font-bold">错题本</h1><p className="mt-2 text-sm leading-6 text-slate-500">汇总各题库的错题，连续两次无错误且未用提示完成复习后标记为已巩固。</p></div>
        </div>
        <div className="surface-card shrink-0 space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="错题类型">
            {([['word', '单词'], ['phrase', '短语']] as const).map(([value, label]) => <Button key={value} type="button" variant={kind === value ? 'default' : 'ghost'} aria-pressed={kind === value} onClick={() => { setKind(value); setSource('all'); resetPage(); }}>{label}</Button>)}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="复习状态">
            {([['pending', '待复习'], ['consolidated', '已巩固'], ['all', '全部']] as const).map(([value, label]) => <Button key={value} type="button" variant={status === value ? 'secondary' : 'ghost'} aria-pressed={status === value} onClick={() => { setStatus(value); resetPage(); }}>{label} {counts[value]}</Button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={source} onValueChange={(value) => { setSource(value); resetPage(); }}>
              <SelectTrigger aria-label="筛选错题题库" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">全部题库</SelectItem>{sources.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Input aria-label="搜索错题" placeholder="搜索英文、中文、题库或分组" value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} className="min-w-0 flex-1 basis-48" />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">每轮</span>
            <Select value={roundSize} onValueChange={setRoundSize}>
              <SelectTrigger aria-label="每轮复习题数" className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{['10', '20', '50'].map((size) => <SelectItem key={size} value={size}>{size} 题</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" disabled={!ready || importing || !pending.length} onClick={() => startReview(pending.slice(0, Number(roundSize)))}><RotateCcw size={16} />开始复习（{Math.min(pending.length, Number(roundSize))}）</Button>
            <span className="ml-auto text-xs text-slate-500">{filtered.length} 道题</span>
          </div>
        </div>
        {(!ready || importing) && <p role="status" className="mt-3 text-sm text-slate-500">正在读取错题本并导入旧错题…</p>}
        {warnings.length > 0 && <div role="alert" className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-700">{warnings.map((warning) => <p key={warning}>{warning}</p>)}<Button type="button" variant="ghost" disabled={importing} onClick={() => setRetry((value) => value + 1)}>重试导入</Button></div>}
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4">
          {ready && !importing && !filtered.length && <p role="status" className="py-12 text-center text-sm text-slate-500">{typedEntries.length ? '没有符合条件的错题，试试其他筛选。' : `暂无${kind === 'word' ? '单词' : '短语'}错题，练习时拼错会自动记录。`}</p>}
          {visible.map((entry) => <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="break-words text-lg font-bold text-ink">{entry.english}</h2><p className="mt-1 break-words text-sm leading-6 text-slate-600">{entry.meaning}</p>{entry.kind === 'word' && entry.phonetics[0] && <p className="mt-1 text-xs text-slate-500">{entry.phonetics[0]}</p>}</div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${entry.status === 'consolidated' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{entry.status === 'consolidated' ? '已巩固' : '待复习'}</span>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">{entry.sourceLabel} · {entry.group ? `第 ${entry.group} 组` : entry.category}</p>
            <p className="text-xs leading-6 text-slate-500">{entry.legacy ? `历史错题 · 新增错误 ${entry.mistakeCount} 次` : `错误 ${entry.mistakeCount} 次`} · 最近出错：{entry.lastErrorAt ? new Date(entry.lastErrorAt).toLocaleString('zh-CN', { hour12: false }) : '暂无记录'} · 已复习 {entry.reviewCount} 次 · 连续完美 {Math.min(2, entry.consecutivePerfect)} / 2</p>
            {entry.lastReviewAt && <p className="text-xs leading-6 text-slate-500">最近复习：{new Date(entry.lastReviewAt).toLocaleString('zh-CN', { hour12: false })}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => startReview([entry])}>再练一次</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => speakWord(entry.english)}><Volume2 size={15} />发音</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => notebook.mark(entry.id, entry.status !== 'consolidated')}><Check size={15} />{entry.status === 'consolidated' ? '恢复待复习' : '标记已巩固'}</Button>
            </div>
          </article>)}
          {visible.length < filtered.length && <Button type="button" variant="ghost" className="w-full" onClick={() => setPage((value) => value + 1)}>加载更多</Button>}
        </div>
    </div>
  );
}
