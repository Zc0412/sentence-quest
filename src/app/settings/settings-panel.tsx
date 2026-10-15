'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowLeft, BookOpenCheck, Search, X } from 'lucide-react';
import type { VocabularyListId } from '@/data/vocabulary';
import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import DictionaryList from './dictionary-list';

interface Props {
  currentListId: VocabularyListId;
}

export default function SettingsPanel({ currentListId }: Props) {
  const [search, setSearch] = useState('');

  return (
    <div className="app-background flex h-dvh flex-col overflow-hidden text-ink md:flex-row">
      <aside id="settings-sidebar" className="border-b border-[#e2e8f0] bg-white/85 px-3 pb-5 pt-5 md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r lg:w-[280px]">
        <div className="mb-6 flex min-w-0 flex-col items-start gap-1 px-2">
          <Image src="/sentleap-logo.png" alt="句跃 SentLeap" width={2172} height={724} priority className="h-12 w-auto max-w-full" />
          <p className="text-[11px] font-medium tracking-[0.04em] text-[#64748b]">一词一跃，玩会英语</p>
        </div>
        <Link href={`/practice/${currentListId}`} className="mb-6 flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors hover:bg-[#eff6ff] hover:text-[#2563eb]">
          <ArrowLeft size={20} /> 返回练习
        </Link>
        <div className="relative mb-5">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索词典或练习" aria-label="搜索词典或练习" className="h-10 w-full rounded-full border-0 bg-[#f1f5f9] pl-10 pr-9 text-sm outline-none placeholder:text-[#94a3b8] [&::-webkit-search-cancel-button]:appearance-none" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="清除搜索" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#64748b] hover:bg-[#dbeafe]"><X size={15} /></button>}
        </div>
        <p className="mb-2 px-2 text-xs font-medium text-[#64748b]">偏好设置</p>
        <nav aria-label="设置导航">
          <Link href="#dictionary-settings" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#dbeafe] px-3 py-3 text-[#2563eb] text-sm font-medium">
            <BookOpenCheck size={20} strokeWidth={1.75} /> 词典
          </Link>
        </nav>
      </aside>

      <main id="dictionary-settings" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-5 py-7 sm:px-10 md:h-full md:px-12 md:py-9 lg:px-20">
        <div className="mx-auto flex min-h-0 w-full max-w-[960px] flex-1 flex-col">
          <header className="mb-9 shrink-0 md:mb-10">
            <h1 className="text-[28px] font-semibold tracking-tight">词典与练习</h1>
            <p className="mt-2 text-sm text-[#64748b]">共 {vocabularyLists.length + phrasePracticeLists.length} 项练习，选择一项开始练习。</p>
          </header>

          <DictionaryList currentListId={currentListId} query={search} />
        </div>
      </main>
    </div>
  );
}
