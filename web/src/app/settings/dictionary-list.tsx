'use client';

import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VocabularyGroupDialog from './vocabulary-group-dialog';
import PhraseCategoryDialog from './phrase-category-dialog';

const categories = ['全部', ...new Set([...vocabularyLists.map((list) => list.category), ...phrasePracticeLists.map((list) => list.category)])];

export default function DictionaryList({ currentListId, currentCategory, currentGroup, query, onQueryChange }: { currentListId: string; currentCategory?: string; currentGroup?: number; query: string; onQueryChange: (value: string) => void }) {
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
            <p className="mt-1 break-words font-bold text-[#0f172a]">{currentList.label}{currentList.kind === 'phrase' && currentCategory ? ` / ${currentCategory}` : ''}{currentList.kind === 'vocabulary' && currentGroup ? ` / 第 ${currentGroup} 组` : ''}</p>
          </div>
        </div>
      )}
      <div className="surface-card shrink-0 p-3 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 md:flex-wrap md:gap-2 md:overflow-visible md:pb-0" role="group" aria-label="内容分类">
          {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setTag('全部'); }} className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors md:px-4 ${category === item ? 'bg-[#3b82f6] text-white' : 'text-[#2563eb] hover:bg-[#eff6ff]'}`}>{item}</button>)}
        </div>
        <div className="relative w-full shrink-0 sm:ml-auto sm:w-56 lg:w-64">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索词库、短语或句型" aria-label="搜索词库、短语或句型" className="h-10 rounded-full border-0 bg-slate-100 pl-10 pr-9 text-base shadow-none sm:text-sm [&::-webkit-search-cancel-button]:appearance-none" />
          {query && <button type="button" onClick={() => onQueryChange('')} aria-label="清除搜索" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-blue-100"><X size={15} /></button>}
        </div>
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
          ) : <VocabularyGroupDialog key={list.id} list={list} current={list.id === currentListId} currentGroup={currentGroup} />)}
          {lists.length === 0 && <p role="status" className="py-16 text-center text-sm text-[#64748b] sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-3">没有找到相关学习内容，请尝试其他关键词或分类。</p>}
        </div>
      </div>
    </div>
  );
}
