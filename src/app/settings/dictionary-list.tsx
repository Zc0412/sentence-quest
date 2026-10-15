'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import type { PhrasePracticeList } from '@/data/phrase-practice';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categories = ['全部', ...new Set([...vocabularyLists.map((list) => list.category), ...phrasePracticeLists.map((list) => list.category)])];

export default function DictionaryList({ currentListId, currentCategory, query }: { currentListId: string; currentCategory?: string; query: string }) {
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const entries = useMemo(() => [
    ...vocabularyLists.map((list) => ({ ...list, kind: 'vocabulary' as const })),
    ...phrasePracticeLists.map((list) => ({ ...list, kind: 'phrase' as const })),
  ], []);
  const tags = useMemo(() => ['全部', ...new Set(entries
    .filter((list) => category === '全部' || list.category === category)
    .flatMap((list) => list.tags))], [category, entries]);
  const lists = useMemo(() => entries.filter((list) =>
    (category === '全部' || list.category === category)
    && (tag === '全部' || list.tags.includes(tag))
    && `${list.label} ${list.id} ${list.description} ${list.category} ${list.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [category, tag, query, entries]);
  const currentList = currentListId === 'home-phrases'
    ? { label: '精选短语 · 20 句', kind: 'phrase' as const }
    : entries.find((list) => list.id === currentListId);

  return (
    <div className="flex min-w-0 flex-col md:min-h-0 md:flex-1">
      {currentList && (
        <div className="mb-3 flex shrink-0 items-start gap-2 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 md:mb-4 md:gap-3 md:px-4 md:py-3" aria-label="当前练习">
          <Check size={18} className="mt-0.5 shrink-0 text-[#2563eb]" />
          <div className="min-w-0 text-sm">
            <p className="text-xs font-medium text-[#64748b]">当前练习 · {currentList.kind === 'phrase' ? '短语' : '单词'}</p>
            <p className="mt-1 break-words font-bold text-[#0f172a]">{currentList.label}{currentList.kind === 'phrase' && currentCategory ? ` / ${currentCategory}` : ''}</p>
          </div>
        </div>
      )}
      <div className="surface-card shrink-0 p-3 md:p-5">
        <div className="flex gap-1 overflow-x-auto pb-1 md:flex-wrap md:gap-2 md:overflow-visible md:pb-0" role="group" aria-label="词典分类">
          {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setTag('全部'); }} className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors md:px-4 ${category === item ? 'bg-[#3b82f6] text-white' : 'text-[#2563eb] hover:bg-[#eff6ff]'}`}>{item}</button>)}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-[#e2e8f0] pt-2 md:mt-4 md:gap-3 md:pt-4">
          <label htmlFor="dictionary-tag" className="shrink-0 text-xs text-[#64748b]">教材 / 系列</label>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger id="dictionary-tag" aria-label="教材 / 系列" className="min-w-0 max-w-[240px] flex-1 gap-2 rounded-lg border-[#e2e8f0] bg-white text-[#0f172a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tags.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto shrink-0 text-xs text-[#64748b]">{lists.length} 项</span>
        </div>
      </div>
      <div className="mt-3 pb-[env(safe-area-inset-bottom)] md:mt-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
        <div className="grid gap-4 pb-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => list.kind === 'phrase' ? (
            <PhraseCategoryDialog key={list.id} list={list} current={list.id === currentListId} currentCategory={currentCategory} />
          ) : <Link key={list.id} href={`/practice/${encodeURIComponent(list.id)}`} prefetch={false} className={`group flex min-w-0 flex-col rounded-[22px] border p-5 transition-colors hover:border-[#93c5fd] hover:bg-[#f8fafc] ${list.id === currentListId ? 'border-[#93c5fd] bg-[#eff6ff] ring-1 ring-[#bfdbfe]' : 'border-[#e2e8f0] bg-white'}`}>
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748b]"><span>{list.category}</span>{list.kind === 'vocabulary' && list.id === currentListId && <span className="flex items-center gap-1 text-[#22c55e]"><Check size={13} /> 当前练习</span>}</div>
            <h2 className="mt-4 text-lg font-bold text-[#0f172a]">{list.label}</h2>
            <p className="mb-5 mt-2 line-clamp-2 text-sm leading-6 text-[#64748b]">{list.description}</p>
            <div className="mt-auto flex items-center justify-between border-t border-[#f1f5f9] pt-4"><span className="text-xs text-[#64748b]">{list.wordCount.toLocaleString()} 个词条</span><span className="flex items-center gap-1 text-xs font-bold text-[#2563eb]">开始练习 <ArrowUpRight size={15} /></span></div>
          </Link>)}
          {lists.length === 0 && <p role="status" className="py-16 text-center text-sm text-[#64748b] sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-3">没有找到相关词典，请尝试其他关键词或分类。</p>}
        </div>
      </div>
    </div>
  );
}

function PhraseCategoryDialog({ list, current, currentCategory }: { list: PhrasePracticeList; current: boolean; currentCategory?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={`group flex min-w-0 flex-col rounded-[22px] border p-5 text-left transition-colors hover:border-[#93c5fd] hover:bg-[#f8fafc] ${current ? 'border-[#93c5fd] bg-[#eff6ff] ring-1 ring-[#bfdbfe]' : 'border-[#e2e8f0] bg-white'}`}>
          <span className="flex w-full items-center justify-between gap-2 text-[11px] text-[#64748b]">
            <span>{list.category}</span>
            {current && <span className="flex items-center gap-1 text-[#22c55e]"><Check size={13} /> 当前练习</span>}
          </span>
          <span className="mt-4 text-lg font-bold text-[#0f172a]">{list.label}</span>
          <span className="mb-5 mt-2 line-clamp-2 text-sm leading-6 text-[#64748b]">{list.description}</span>
          {current && currentCategory && <span className="mb-3 text-xs font-semibold text-[#2563eb]">当前分类：{currentCategory}</span>}
          <span className="mt-auto flex w-full items-center justify-between gap-2 border-t border-[#f1f5f9] pt-4">
            <span className="text-xs text-[#64748b]">{list.wordCount.toLocaleString()} 道题</span>
            <span className="flex items-center gap-1 text-xs font-bold text-[#2563eb]">选择分类 <ArrowUpRight size={15} /></span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="modal-content w-[calc(100%-2rem)] max-w-2xl">
        <DialogTitle className="pr-8 text-xl font-bold text-ink">{list.label}</DialogTitle>
        <DialogDescription className="mb-5 mt-2 text-sm leading-6 text-[#64748b]">选择一个分类开始练习</DialogDescription>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.categories.map(({ name, count }) => (
            <Link key={name} href={`/practice/${encodeURIComponent(list.id)}?category=${encodeURIComponent(name)}`} prefetch={false} aria-current={current && currentCategory === name ? 'true' : undefined} className={`group flex min-w-0 flex-col rounded-2xl border p-4 transition-colors hover:border-[#93c5fd] hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#93c5fd] ${current && currentCategory === name ? 'border-[#93c5fd] bg-[#eff6ff] ring-1 ring-[#bfdbfe]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}>
              <span className="font-bold text-ink group-hover:text-[#2563eb]">{name}</span>
              {current && currentCategory === name && <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#2563eb]"><Check size={13} /> 当前练习</span>}
              <span className="mt-3 flex items-center justify-between text-xs text-[#64748b]">{count} 道题 <ArrowUpRight size={15} className="text-[#2563eb]" /></span>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
