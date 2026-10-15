'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpenCheck, Check, Search } from 'lucide-react';
import { vocabularyLists } from '@/data/vocabulary';

const categories = ['全部', ...new Set(vocabularyLists.map((list) => list.category))];

export default function DictionaryList({ currentListId }: { currentListId: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const tags = useMemo(() => ['全部', ...new Set(vocabularyLists.filter((list) => category === '全部' || list.category === category).flatMap((list) => list.tags))], [category]);
  const lists = useMemo(() => vocabularyLists.filter((list) =>
    (category === '全部' || list.category === category)
    && (tag === '全部' || list.tags.includes(tag))
    && `${list.label} ${list.id} ${list.description} ${list.category} ${list.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [category, tag, query]);

  return (
    <div className="app-background min-h-dvh px-5 py-7 text-ink sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href={`/practice/${encodeURIComponent(currentListId)}`} className="flex items-center gap-2 rounded-xl py-2 text-sm font-semibold text-[#8674b8] hover:text-[#65558e]"><ArrowLeft size={18} /> 返回练习</Link>
          <Link href={`/settings?listId=${encodeURIComponent(currentListId)}`} className="text-sm font-medium text-[#8674b8] hover:text-[#65558e]">练习设置</Link>
        </header>
        <div className="mb-8 mt-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0edff] text-[#795ee0]"><BookOpenCheck size={25} /></div>
          <div><h1 className="text-3xl font-bold tracking-tight">探索词库</h1><p className="mt-2 text-sm text-[#968faa]">{vocabularyLists.length} 本词典，找到适合你的下一段练习。</p></div>
        </div>
        <div className="surface-card p-4 sm:p-5">
          <div className="relative">
            <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a29bb2]" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索词典" placeholder="搜索词典名称、考试、教材或关键词" className="h-12 w-full rounded-2xl border border-[#e7e2f4] bg-[#f8f7fc] pl-12 pr-4 text-sm placeholder:text-[#a29bb2]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="词典分类">
            {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setTag('全部'); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${category === item ? 'bg-[#7c61df] text-white' : 'text-[#8674b8] hover:bg-[#f0edff]'}`}>{item}</button>)}
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-[#ece8f4] pt-4">
            <label htmlFor="dictionary-tag" className="shrink-0 text-xs text-[#968faa]">教材 / 系列</label>
            <select id="dictionary-tag" value={tag} onChange={(event) => setTag(event.target.value)} className="min-w-0 rounded-lg border border-[#e7e2f4] bg-white px-3 py-2 text-sm text-[#65558e]">
              {tags.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <span className="ml-auto shrink-0 text-xs text-[#968faa]">{lists.length} 本</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => <Link key={list.id} href={`/practice/${encodeURIComponent(list.id)}`} prefetch={false} className="group flex min-w-0 flex-col rounded-[22px] border border-[#eae6f3] bg-white p-5 transition-colors hover:border-[#bca9ef] hover:bg-[#fdfcff]">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#968faa]"><span>{list.category}</span>{list.id === currentListId && <span className="flex items-center gap-1 text-[#2e9c70]"><Check size={13} /> 当前练习</span>}</div>
            <h2 className="mt-4 text-lg font-bold text-[#65558e]">{list.label}</h2>
            <p className="mb-5 mt-2 line-clamp-2 text-sm leading-6 text-[#968faa]">{list.description}</p>
            <div className="mt-auto flex items-center justify-between border-t border-[#f0edf7] pt-4"><span className="text-xs text-[#a29bb2]">{list.wordCount.toLocaleString()} 个词条</span><span className="flex items-center gap-1 text-xs font-bold text-[#795ee0]">开始练习 <ArrowUpRight size={15} /></span></div>
          </Link>)}
        </div>
        {lists.length === 0 && <p role="status" className="py-16 text-center text-sm text-[#968faa]">没有找到相关词典，请尝试其他关键词或分类。</p>}
        <footer className="py-8 text-center text-xs leading-6 text-[#a29bb2]">词典目录与数据来源于 <a href="https://github.com/zyronon/TypeWords" target="_blank" rel="noreferrer" className="underline underline-offset-4">TypeWords</a> · 各词典独立保存学习进度</footer>
      </div>
    </div>
  );
}
