'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useState } from 'react';
import { ArrowLeft, BookOpenCheck, Search, X } from 'lucide-react';
import type { VocabularyListId } from '@/data/vocabulary';
import DictionaryList from './dictionary-list';

interface Props {
  currentListId: VocabularyListId;
  currentCategory?: string;
}

export default function SettingsPanel({ currentListId, currentCategory }: Props) {
  const [search, setSearch] = useState('');

  return (
    <div className="app-background flex h-dvh flex-col overflow-hidden text-ink md:flex-row">
      <aside id="settings-sidebar" className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[#e2e8f0] bg-white/85 px-3 py-2 md:sticky md:top-0 md:block md:h-dvh md:w-[248px] md:overflow-y-auto md:border-b-0 md:border-r md:pb-5 md:pt-5 lg:w-[280px]">
        <div className="flex min-w-0 flex-col items-start gap-1 md:mb-6 md:px-2">
          <Logo />
          <p className="hidden text-[11px] font-medium tracking-[0.04em] text-[#64748b] md:block">一词一跃，玩会英语</p>
        </div>
        <Link href={currentListId === 'home-phrases' ? '/' : `/practice/${encodeURIComponent(currentListId)}${currentCategory ? `?category=${encodeURIComponent(currentCategory)}` : ''}`} className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors hover:bg-[#eff6ff] hover:text-[#2563eb] md:mb-6 md:gap-3">
          <ArrowLeft size={20} /> 返回练习
        </Link>
        <div className="relative col-span-2 md:mb-5">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索词典或练习" aria-label="搜索词典或练习" className="h-10 w-full rounded-full border-0 bg-[#f1f5f9] pl-10 pr-9 text-base outline-none placeholder:text-[#94a3b8] md:text-sm [&::-webkit-search-cancel-button]:appearance-none" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="清除搜索" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#64748b] hover:bg-[#dbeafe]"><X size={15} /></button>}
        </div>
        <p className="mb-2 hidden px-2 text-xs font-medium text-[#64748b] md:block">偏好设置</p>
        <nav aria-label="设置导航" className="hidden md:block">
          <Link href="#dictionary-settings" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#dbeafe] px-3 py-3 text-[#2563eb] text-sm font-medium">
            <BookOpenCheck size={20} strokeWidth={1.75} /> 词典
          </Link>
        </nav>
      </aside>

      <main id="dictionary-settings" aria-label="词典设置" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 md:h-full md:overflow-hidden md:px-12 md:py-9 lg:px-20">
        <div className="mx-auto w-full max-w-[960px] md:flex md:min-h-0 md:flex-1 md:flex-col">
          <DictionaryList currentListId={currentListId} currentCategory={currentCategory} query={search} />
        </div>
      </main>
    </div>
  );
}
