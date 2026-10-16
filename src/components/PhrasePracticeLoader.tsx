'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { PhrasePracticeList } from '@/data/phrase-practice';
import { SentencePracticeApp } from '@/components/SentencePracticeApp';
import type { Sentence } from '@/types/game';
import { loadPhraseSentences } from '@/data/phrase-sentences';

export function PhrasePracticeLoader({ list, category }: { list: PhrasePracticeList; category: string }) {
  const [sentenceList, setSentenceList] = useState<Sentence[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const categorySentences = useMemo(
    () => sentenceList?.filter((sentence) => sentence.category === category) ?? [],
    [sentenceList, category],
  );

  useEffect(() => {
    const controller = new AbortController();
    setSentenceList(null);
    setError('');

    void loadPhraseSentences(list, controller.signal)
      .then(setSentenceList)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : '题库加载失败');
      });

    return () => controller.abort();
  }, [list, retry]);

  if (categorySentences.length > 0) return (
    <SentencePracticeApp
      key={`${list.id}:${category}`}
      sentenceList={categorySentences}
      title={`${list.label} · ${category}`}
      listId={list.id}
      isPhrasePractice
      categoryName={category}
    />
  );

  return (
    <main className="app-background flex min-h-dvh items-center justify-center p-6">
      <section className="surface-card w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-ink">{error ? '无法打开短语练习' : '正在加载短语题库…'}</h1>
        {error
          ? <p role="alert" className="mt-3 text-sm leading-6 text-[#b45309]">{error}</p>
          : <div role="status" className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-[3px] border-[#dbeafe] border-t-[#3b82f6]" />}
        <div className="mt-6 flex justify-center gap-3">
          {error && <button type="button" onClick={() => setRetry((value) => value + 1)} className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white">重试</button>}
          <Link href={`/settings?listId=${encodeURIComponent(list.id)}&category=${encodeURIComponent(category)}`} className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-sm font-bold text-[#475569]">返回学习内容</Link>
        </div>
      </section>
    </main>
  );
}
