'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import { usePracticeSettings } from '@/components/PracticeSettingsProvider';
import { ArrowLeft, BookOpenCheck, SlidersHorizontal, Keyboard } from 'lucide-react';
import type { VocabularyListId } from '@/data/vocabulary';
import DictionaryList from './dictionary-list';
import KeyboardShortcuts from './keyboard-shortcuts';

interface Props {
  currentListId: VocabularyListId;
  currentCategory?: string;
}

export default function SettingsPanel({ currentListId, currentCategory }: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('dictionary');
  const { hintsEnabled, ready, warning, setHintsEnabled } = usePracticeSettings();

  return (
    <Tabs.Root value={tab} onValueChange={setTab} className="app-background flex h-dvh flex-col overflow-hidden text-ink md:flex-row">
      <aside id="settings-sidebar" className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[#e2e8f0] bg-white/85 px-3 py-2 md:sticky md:top-0 md:block md:h-dvh md:w-[248px] md:overflow-y-auto md:border-b-0 md:border-r md:pb-5 md:pt-5 lg:w-[280px]">
        <div className="flex min-w-0 flex-col items-start gap-1 md:mb-6 md:px-2">
          <Logo />
          <p className="hidden text-[11px] font-medium tracking-[0.04em] text-[#64748b] md:block">一词一跃，玩会英语</p>
        </div>
        <Link href={currentListId === 'home-phrases' ? '/' : `/practice/${encodeURIComponent(currentListId)}${currentCategory ? `?category=${encodeURIComponent(currentCategory)}` : ''}`} className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors hover:bg-[#eff6ff] hover:text-[#2563eb] md:mb-6 md:gap-3">
          <ArrowLeft size={20} /> 返回练习
        </Link>
        <p className="mb-2 hidden px-2 text-xs font-medium text-[#64748b] md:block">偏好设置</p>
        <Tabs.List aria-label="设置导航" className="col-span-2 flex gap-1 overflow-x-auto md:flex-col md:gap-2">
          <Tabs.Trigger value="dictionary" className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-medium hover:bg-blue-50 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <BookOpenCheck size={20} /> 学习内容
          </Tabs.Trigger>
          <Tabs.Trigger value="practice" className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-medium hover:bg-blue-50 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <SlidersHorizontal size={20} /> 练习设置
          </Tabs.Trigger>
          <Tabs.Trigger value="shortcuts" className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-medium hover:bg-blue-50 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <Keyboard size={20} /> 快捷键
          </Tabs.Trigger>
        </Tabs.List>
      </aside>

      <main aria-label="设置内容" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 md:h-full md:overflow-hidden md:px-12 md:py-9 lg:px-20">
        <div className="mx-auto w-full max-w-[960px] md:flex md:min-h-0 md:flex-1 md:flex-col">
          <Tabs.Content value="dictionary" className="min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
            <DictionaryList currentListId={currentListId} currentCategory={currentCategory} query={search} onQueryChange={setSearch} />
          </Tabs.Content>
          <Tabs.Content value="shortcuts" className="min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
            <KeyboardShortcuts />
          </Tabs.Content>
          <Tabs.Content value="practice" className="space-y-6 pb-20">
            <div>
              <h1 className="text-2xl font-bold">练习设置</h1>
              <p className="mt-2 text-sm text-slate-500">调整适合自己的练习方式，设置保存在当前浏览器。</p>
            </div>
            <div className="flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <label htmlFor="letter-hints" className="cursor-pointer font-semibold">字母提示</label>
                <p id="letter-hints-description" className="mt-2 text-sm leading-6 text-slate-500">启用后显示“多给一个字母”按钮并启用对应快捷键。关闭后隐藏按钮并禁用快捷键，适用于单词、短语和句子练习。</p>
              </div>
              <Switch.Root id="letter-hints" checked={hintsEnabled} onCheckedChange={setHintsEnabled} disabled={!ready} aria-describedby="letter-hints-description" className="inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 p-0.5 transition-colors data-[state=checked]:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-50">
                <Switch.Thumb className="block h-5 w-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
              </Switch.Root>
            </div>
            {warning && <p role="status" className="text-sm text-orange-700">{warning}</p>}
          </Tabs.Content>
        </div>
      </main>
    </Tabs.Root>
  );
}
