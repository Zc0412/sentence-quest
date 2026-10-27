'use client';

import { useCallback } from 'react';
import { loadVocabularyWords } from '@/data/vocabulary';
import { vocabularyGroups, VOCABULARY_GROUP_SIZE } from '@/utils/vocabulary-groups';
import { loadProgress } from '@/utils/storage';
import { PracticeSelectionDialog } from '@/components/PracticeSelectionDialog';

interface Props {
  list: { id: string; label: string; description: string; category: string; wordCount: number };
  current: boolean;
  currentGroup?: number;
}

export default function VocabularyGroupDialog({ list, current, currentGroup }: Props) {
  const loadItems = useCallback(async () => {
    const [words, loaded] = await Promise.all([loadVocabularyWords(list.id), loadProgress()]);
    const known = new Set(loaded.progress.vocabularyProgress[list.id]?.knownWords ?? []);
    return vocabularyGroups(list.wordCount).map((group) => ({
      id: String(group.id), label: group.label,
      details: `第 ${group.start + 1}–${group.end} 个 · ${group.count} 词`,
      total: group.count,
      mastered: words.slice(group.start, group.end).filter((word) => known.has(word.name)).length,
      active: current && currentGroup === group.id,
      href: `/practice/${encodeURIComponent(list.id)}?group=${group.id}`,
    }));
  }, [list.id, list.wordCount, current, currentGroup]);

  return <PracticeSelectionDialog
    list={list} current={current}
    currentLabel={currentGroup ? `第 ${currentGroup} 组` : undefined}
    selectionLabel="分组"
    summary={`${list.wordCount.toLocaleString()} 个词条 · ${vocabularyGroups(list.wordCount).length} 组`}
    description={`每组最多 ${VOCABULARY_GROUP_SIZE} 个单词，选择一个分组开始练习。`}
    loadItems={loadItems}
  />;
}
