/** 学习内容列表：使用本地目录筛选题库，青少年教材按年级展示版本。 */
'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Search, X } from 'lucide-react';
import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { gradeLabels, youthGrade } from '@/utils/youth-grades';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VocabularyGroupDialog from './vocabulary-group-dialog';
import PhraseCategoryDialog from './phrase-category-dialog';

const categoryOrder = ['青少年英语', '中国考试', '国际考试', '短语练习', '代码练习', '开发测试'];
const availableCategories = [...new Set([
  ...vocabularyLists.map((list) => list.category),
  ...phrasePracticeLists.map((list) => list.category),
])];
// 按指定顺序展示已有分类，开发测试仍仅在开发环境出现；新增分类追加到末尾。
const categories = [
  '全部',
  ...categoryOrder.filter((category) => availableCategories.includes(category)),
  ...availableCategories.filter((category) => !categoryOrder.includes(category)),
];

export default function DictionaryList({ currentListId, currentCategory, currentGroup, query, onQueryChange }: { currentListId: string; currentCategory?: string; currentGroup?: number; query: string; onQueryChange: (value: string) => void }) {
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const [grade, setGrade] = useState<string | null>(null);
  const entries = useMemo(() => [
    ...vocabularyLists.map((list) => ({ ...list, kind: 'vocabulary' as const })),
    ...phrasePracticeLists.map((list) => ({ ...list, kind: 'phrase' as const })),
  ], []);
  const tags = useMemo(() => ['全部', ...new Set(entries
    .filter((list) => (category === '全部' || list.category === category)
      && (!grade || youthGrade(list) === grade))
    .flatMap((list) => list.tags))], [category, grade, entries]);
  const matchingLists = useMemo(() => entries.filter((list) =>
    (category === '全部' || list.category === category)
    && (tag === '全部' || list.tags.includes(tag))
    && `${list.label} ${list.id} ${list.description} ${list.category} ${list.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [category, tag, query, entries]);
  const isYouth = category === '青少年英语';
  const gradeGroups = isYouth && !grade ? gradeLabels.map((label) => {
    const gradeLists = matchingLists.filter((list) => youthGrade(list) === label);
    return {
      label,
      count: gradeLists.length,
      versions: [...new Set(gradeLists.flatMap((list) => list.tags))],
    };
  }).filter((group) => group.count > 0) : [];
  const lists = isYouth
    ? matchingLists.filter((list) => grade ? youthGrade(list) === grade : !youthGrade(list))
    : matchingLists;
  const resultCount = lists.length + gradeGroups.reduce((sum, group) => sum + group.count, 0);

  /** 切换层级时重置版本筛选，避免隐藏新层级的教材。 */
  function selectGrade(value: string | null) {
    setGrade(value);
    setTag('全部');
  }
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
          {categories.map((item) => <Button variant="ghost" key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); selectGrade(null); }} className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors md:px-4 ${category === item ? 'bg-[#3b82f6] text-white' : 'text-[#2563eb] hover:bg-[#eff6ff]'}`}>{item}</Button>)}
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
          <span className="ml-auto shrink-0 text-xs text-[#64748b]">{resultCount} 个题库</span>
        </div>
      </div>
      <div className="mt-3 pb-[env(safe-area-inset-bottom)] md:mt-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
        {isYouth && grade && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="返回青少年英语"
              title="返回青少年英语"
              onClick={() => selectGrade(null)}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <h2 className="font-semibold text-slate-800">{grade} · 各版本题库</h2>
          </div>
        )}
        <div className="grid gap-4 pb-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {gradeGroups.map((group) => (
            <Button
              key={group.label}
              variant="outline"
              onClick={() => selectGrade(group.label)}
              className="group flex h-auto min-w-0 flex-col items-start justify-start gap-0 whitespace-normal rounded-[22px] border border-[#e2e8f0] bg-white p-5 text-left font-normal shadow-none transition-colors hover:border-[#93c5fd] hover:bg-[#f8fafc]"
            >
              <span className="text-[11px] text-[#64748b]">青少年英语</span>
              <span className="mt-4 text-lg font-bold text-[#0f172a]">{group.label}</span>
              <span className="mb-5 mt-2 break-words text-sm leading-6 text-[#64748b]">
                {group.versions.join(' · ')}
              </span>
              <span className="mt-auto flex w-full items-center justify-between gap-2 border-t border-[#f1f5f9] pt-4 text-xs text-[#64748b]">
                <span>{group.count} 个题库</span>
                <ArrowUpRight size={15} className="text-[#2563eb]" aria-hidden="true" />
              </span>
            </Button>
          ))}
          {lists.map((list) => list.kind === 'phrase' ? (
            <PhraseCategoryDialog key={list.id} list={list} current={list.id === currentListId} currentCategory={currentCategory} />
          ) : <VocabularyGroupDialog key={list.id} list={list} current={list.id === currentListId} currentGroup={currentGroup} />)}
          {resultCount === 0 && <p role="status" className="py-16 text-center text-sm text-[#64748b] sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-3">没有找到相关学习内容，请尝试其他关键词或分类。</p>}
        </div>
      </div>
    </div>
  );
}
