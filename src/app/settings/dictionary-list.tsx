'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { vocabularyLists } from '@/data/vocabulary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categories = ['全部', ...new Set(vocabularyLists.map((list) => list.category))];

export default function DictionaryList({ currentListId, query }: { currentListId: string; query: string }) {
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const tags = useMemo(() => ['全部', ...new Set(vocabularyLists.filter((list) => category === '全部' || list.category === category).flatMap((list) => list.tags))], [category]);
  const lists = useMemo(() => vocabularyLists.filter((list) =>
    (category === '全部' || list.category === category)
    && (tag === '全部' || list.tags.includes(tag))
    && `${list.label} ${list.id} ${list.description} ${list.category} ${list.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [category, tag, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="surface-card shrink-0 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="词典分类">
          {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setTag('全部'); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${category === item ? 'bg-[#3b82f6] text-white' : 'text-[#2563eb] hover:bg-[#eff6ff]'}`}>{item}</button>)}
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-[#e2e8f0] pt-4">
          <label htmlFor="dictionary-tag" className="shrink-0 text-xs text-[#64748b]">教材 / 系列</label>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger id="dictionary-tag" aria-label="教材 / 系列" className="min-w-0 max-w-[240px] flex-1 gap-2 rounded-lg border-[#e2e8f0] bg-white text-[#0f172a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tags.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto shrink-0 text-xs text-[#64748b]">{lists.length} 本</span>
        </div>
      </div>
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid gap-4 pb-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => <Link key={list.id} href={`/practice/${encodeURIComponent(list.id)}`} prefetch={false} className="group flex min-w-0 flex-col rounded-[22px] border border-[#e2e8f0] bg-white p-5 transition-colors hover:border-[#93c5fd] hover:bg-[#f8fafc]">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748b]"><span>{list.category}</span>{list.id === currentListId && <span className="flex items-center gap-1 text-[#22c55e]"><Check size={13} /> 当前练习</span>}</div>
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
