'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PhrasePracticeList } from '@/data/phrase-practice';
import { SentencePracticeApp } from '@/components/SentencePracticeApp';
import type { Sentence } from '@/types/game';

function isSentence(value: unknown): value is Sentence {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.unit === 'number'
    && typeof item.category === 'string'
    && typeof item.zh === 'string'
    && typeof item.english === 'string'
    && Array.isArray(item.words)
    && item.words.every((word) => typeof word === 'string')
    && typeof item.note === 'string'
    && Array.isArray(item.annotations)
    && Array.isArray(item.grammar);
}

export function PhrasePracticeLoader({ list }: { list: PhrasePracticeList }) {
  const [sentenceList, setSentenceList] = useState<Sentence[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSentenceList(null);
    setError('');

    void fetch(list.file, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`题库加载失败（HTTP ${response.status}）`);
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length === 0 || !data.every(isSentence)) {
          throw new Error('题库数据格式不正确或内容为空');
        }
        setSentenceList(data.map((sentence) => ({
          ...sentence,
          id: `${list.id}:${sentence.id}`,
        })));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : '题库加载失败');
      });

    return () => controller.abort();
  }, [list, retry]);

  if (sentenceList) return <SentencePracticeApp key={list.id} sentenceList={sentenceList} title={list.label} isPhrasePractice />;

  return (
    <main className="app-background flex min-h-dvh items-center justify-center p-6">
      <section className="surface-card w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-ink">{error ? '无法打开短语练习' : '正在加载短语题库…'}</h1>
        {error
          ? <p role="alert" className="mt-3 text-sm leading-6 text-[#b45309]">{error}</p>
          : <div role="status" className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-[3px] border-[#dbeafe] border-t-[#3b82f6]" />}
        <div className="mt-6 flex justify-center gap-3">
          {error && <button type="button" onClick={() => setRetry((value) => value + 1)} className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white">重试</button>}
          <Link href="/settings" className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-sm font-bold text-[#475569]">返回词典</Link>
        </div>
      </section>
    </main>
  );
}
