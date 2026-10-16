'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';

export interface PracticeSelectionItem {
  id: string;
  label: string;
  details: string;
  total: number;
  mastered: number;
  href: string;
  active: boolean;
}

interface Props {
  list: { label: string; description: string; category: string };
  current: boolean;
  currentLabel?: string;
  selectionLabel: string;
  summary: string;
  description: string;
  loadItems: () => Promise<PracticeSelectionItem[]>;
}

export function PracticeSelectionDialog({ list, current, currentLabel, selectionLabel, summary, description, loadItems }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PracticeSelectionItem[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    setError('');
    void loadItems().then((loaded) => {
      if (!cancelled) setItems(loaded);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : '练习进度加载失败');
    });
    return () => { cancelled = true; };
  }, [open, loadItems, retry]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={`group flex min-w-0 flex-col rounded-[22px] border p-5 text-left transition-colors hover:border-[#93c5fd] hover:bg-[#f8fafc] ${current ? 'border-[#93c5fd] bg-[#eff6ff] ring-1 ring-[#bfdbfe]' : 'border-[#e2e8f0] bg-white'}`}>
          <span className="flex w-full items-center justify-between gap-2 text-[11px] text-[#64748b]">
            <span>{list.category}</span>
            {current && <span className="flex items-center gap-1 text-[#22c55e]"><Check size={13} /> 当前练习</span>}
          </span>
          <span className="mt-4 text-lg font-bold text-[#0f172a]">{list.label}</span>
          <span className="mb-5 mt-2 line-clamp-2 text-sm leading-6 text-[#64748b]">{list.description}</span>
          {current && currentLabel && <span className="mb-3 text-xs font-semibold text-[#2563eb]">当前{selectionLabel}：{currentLabel}</span>}
          <span className="mt-auto flex w-full items-center justify-between gap-2 border-t border-[#f1f5f9] pt-4">
            <span className="text-xs text-[#64748b]">{summary}</span>
            <span className="flex items-center gap-1 text-xs font-bold text-[#2563eb]">选择{selectionLabel} <ArrowUpRight size={15} /></span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="modal-content practice-selection-dialog w-[calc(100%-2rem)] max-w-2xl">
        <DialogTitle className="shrink-0 pr-8 text-xl font-bold text-ink">{list.label}</DialogTitle>
        <DialogDescription className="shrink-0 text-sm leading-6 text-[#64748b]">{description}</DialogDescription>
        {error && <div role="alert"><p className="text-sm text-orange-700">{error}</p><Button type="button" variant="secondary" onClick={() => setRetry((value) => value + 1)}>重试</Button></div>}
        {!items && !error && <p role="status" className="py-6 text-center text-sm text-[#64748b]">正在加载{selectionLabel}进度…</p>}
        {items && <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto overscroll-contain p-1 sm:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href} prefetch={false} aria-current={item.active ? 'true' : undefined} className={`group flex min-w-0 flex-col rounded-2xl border p-4 transition-colors hover:border-[#93c5fd] hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#93c5fd] ${item.active ? 'border-[#93c5fd] bg-[#eff6ff] ring-1 ring-[#bfdbfe]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}>
              <span className="font-bold text-ink group-hover:text-[#2563eb]">{item.label}</span>
              <span className="mt-2 text-xs text-[#64748b]">{item.details}</span>
              <span className={`mt-2 text-xs font-semibold ${item.total > 0 && item.mastered === item.total ? 'text-[#16a34a]' : 'text-[#64748b]'}`}>已掌握 {item.mastered} / {item.total}</span>
              {item.active && <span className="mt-2 text-xs font-semibold text-[#2563eb]">当前练习</span>}
            </Link>
          ))}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
