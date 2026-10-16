'use client';

import { useCallback } from 'react';
import type { PhrasePracticeList } from '@/data/phrase-practice';
import { loadPhraseSentences } from '@/data/phrase-sentences';
import { loadProgress } from '@/utils/storage';
import { PracticeSelectionDialog } from '@/components/PracticeSelectionDialog';

export default function PhraseCategoryDialog({ list, current, currentCategory }: { list: PhrasePracticeList; current: boolean; currentCategory?: string }) {
  const loadItems = useCallback(async () => {
    const [sentences, loaded] = await Promise.all([loadPhraseSentences(list), loadProgress()]);
    const completed = new Set(loaded.progress.completedIds);
    return list.categories.map(({ name }) => {
      const members = sentences.filter((sentence) => sentence.category === name);
      return {
        id: name, label: name, details: `${members.length} 道题`, total: members.length,
        mastered: members.filter((sentence) => completed.has(sentence.id)).length,
        active: current && currentCategory === name,
        href: `/practice/${encodeURIComponent(list.id)}?category=${encodeURIComponent(name)}`,
      };
    });
  }, [list, current, currentCategory]);

  return <PracticeSelectionDialog
    list={list} current={current} currentLabel={currentCategory}
    selectionLabel="分类"
    summary={`${list.wordCount.toLocaleString()} 道题 · ${list.categories.length} 类`}
    description="选择一个分类开始练习。"
    loadItems={loadItems}
  />;
}
