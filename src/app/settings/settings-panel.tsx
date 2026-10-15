'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, Check, Search, Settings, X } from 'lucide-react';
import type { VocabularyListId } from '@/data/vocabulary';
import { vocabularyLists } from '@/data/vocabulary';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  currentListId: VocabularyListId;
}

export default function SettingsPanel({ currentListId }: Props) {
  const router = useRouter();
  const [selectedListId, setSelectedListId] = useState<VocabularyListId>(currentListId);
  const [search, setSearch] = useState('');
  const currentList = vocabularyLists.find((list) => list.id === currentListId)!;
  const selectedList = vocabularyLists.find((list) => list.id === selectedListId)!;
  const matchesSearch = `常规 当前词库 单词 练习 ${vocabularyLists.map((list) => `${list.label} ${list.description}`).join(' ')}`
    .toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());

  return (
    <div className="app-background min-h-dvh text-ink md:flex">
      <aside id="settings-sidebar" className="border-b border-[#e7e2f4] bg-white/85 px-3 pb-5 pt-5 md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r lg:w-[280px]">
        <div className="mb-6 flex min-w-0 items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#9c83f5] to-[#7456db] text-white shadow-[0_9px_24px_#8670d952]">
            <BookOpenCheck size={22} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[18px] font-black leading-tight tracking-[-0.04em] text-ink">Sentence Quest<span className="text-[#8e73ed]">.</span></div>
            <p className="mt-0.5 text-[11px] font-medium tracking-[0.04em] text-[#968faa]">一句一句，玩会英语</p>
          </div>
        </div>
        <Link href={`/practice/${currentListId}`} className="mb-6 flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors hover:bg-[#f7f4ff] hover:text-[#65558e]">
          <ArrowLeft size={20} /> 返回练习
        </Link>
        <div className="relative mb-5">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a29bb2]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索设置" aria-label="搜索设置" className="h-10 w-full rounded-full border-0 bg-[#f7f4fb] pl-10 pr-9 text-sm outline-none placeholder:text-[#a29bb2] [&::-webkit-search-cancel-button]:appearance-none" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="清除搜索" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#968faa] hover:bg-[#f0edff]"><X size={15} /></button>}
        </div>
        <p className="mb-2 px-2 text-xs font-medium text-[#a29bb2]">偏好设置</p>
        <nav aria-label="设置导航">
          <Link href="#general-settings" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#f0edff] px-3 py-3 text-[#795ee0] text-sm font-medium">
            <Settings size={20} strokeWidth={1.75} /> 常规
          </Link>
        </nav>
      </aside>

      <main id="general-settings" className="min-w-0 flex-1 px-5 py-7 sm:px-10 md:px-12 md:py-9 lg:px-20">
        <div className="mx-auto w-full max-w-[960px]">
          <header className="mb-9 flex items-center gap-3 md:mb-10">
            <h1 className="text-[28px] font-semibold tracking-tight">常规</h1>
          </header>

          {matchesSearch ? (
            <>
              <section aria-labelledby="vocabulary-label" className="flex flex-col gap-5 rounded-[20px] border border-[#eae6f3] bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <div className="min-w-0">
                  <label id="vocabulary-label" htmlFor="vocabulary-list" className="text-[15px] font-semibold">当前词库</label>
                  <p className="mt-1 text-sm leading-6 text-[#968faa]">选择你想练习的单词词库</p>
                </div>
                <Select value={selectedListId} onValueChange={(value) => {
                  const list = vocabularyLists.find((item) => item.id === value);
                  if (list) setSelectedListId(list.id);
                }}>
                  <SelectTrigger id="vocabulary-list" aria-label="选择单词词库" className="h-11 w-full gap-3 rounded-full border-[#e7e2f4] bg-[#f7f4ff] px-4 text-sm font-medium text-[#65558e] shadow-none sm:w-auto sm:max-w-[60%]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vocabularyLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>{list.label}（{list.wordCount.toLocaleString()} 个单词）</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
              <p className="mt-3 px-1 text-sm leading-6 text-[#968faa]">{selectedList.description}</p>
              <Link href={`/dict-list?listId=${encodeURIComponent(currentListId)}`} className="mt-3 inline-flex items-center gap-2 px-1 text-sm font-semibold text-[#795ee0] hover:text-[#65558e]">
                <BookOpenCheck size={17} /> 浏览全部 {vocabularyLists.length} 本词典
              </Link>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-[#968faa]">
                  <Check size={15} className="shrink-0 text-[#39a77b]" /> 当前正在练习：{currentList.label}
                </p>
                <Button type="button" className="h-10 rounded-full bg-[#7c61df] px-5 text-sm font-medium text-white shadow-none hover:bg-[#6950d1]" onClick={() => router.push(`/practice/${selectedListId}`)}>
                  应用并开始练习
                </Button>
              </div>
            </>
          ) : (
            <div role="status" className="rounded-[20px] border border-dashed border-[#e7e2f4] bg-white/85 px-6 py-12 text-center">
              <p className="text-sm text-[#968faa]">没有找到与“{search}”相关的设置</p>
              <button type="button" onClick={() => setSearch('')} className="mt-3 text-sm font-medium text-[#795ee0] underline underline-offset-4">清除搜索</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
