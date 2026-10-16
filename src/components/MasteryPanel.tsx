import { BookOpen, Check, RotateCcw, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import type { ReactNode } from 'react';

interface Props {
  kind: 'word' | 'phrase';
  listLabel: string;
  total: number;
  typingStats: { input: number; correct: number };
  onReplay: () => void;
  onReview?: () => void;
  saved?: boolean;
  reviewSummary?: number;
  extraAction?: ReactNode;
}

export function MasteryPanel({ kind, listLabel, total, typingStats, onReplay, onReview, saved = true, reviewSummary, extraAction }: Props) {
  return (
    <section className="end-state my-auto flex !h-auto shrink-0 flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <div className="mb-6 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#dcfce7] text-[#16a34a]"><Trophy size={50} /></div>
      <span className="section-overline text-[#16a34a]">{reviewSummary !== undefined ? 'REVIEW COMPLETE' : kind === 'word' ? 'ALL WORDS MASTERED' : 'ALL PHRASES MASTERED'}</span>
      <h2 className="mt-3 text-[32px] font-extrabold text-ink sm:text-[38px]">{reviewSummary !== undefined ? '本轮复习完成！' : '全部掌握！'}</h2>
      <p className="mt-3 max-w-md leading-7 text-[#475569]">{reviewSummary !== undefined ? `本轮完成 ${total} 道题，其中 ${reviewSummary} 道已巩固。连续两次无错误且未用提示完成复习，会自动标记为已巩固。` : `太棒了，${listLabel} 的 ${total} 个${kind === 'word' ? '单词' : '短语'}都已掌握。`}</p>
      <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#f8fafc] px-3 py-4"><div className="text-xl font-black tabular-nums text-[#16a34a]">{total}</div><div className="mt-1 text-xs text-[#64748b]">{reviewSummary !== undefined ? '已完成' : '已掌握'}</div></div>
        <div className="rounded-2xl bg-[#f8fafc] px-3 py-4"><div className="text-xl font-black tabular-nums text-ink">{typingStats.input}</div><div className="mt-1 text-xs text-[#64748b]">输入数</div></div>
        <div className="rounded-2xl bg-[#f8fafc] px-3 py-4"><div className="text-xl font-black tabular-nums text-[#14b8a6]">{typingStats.input ? `${(typingStats.correct / typingStats.input * 100).toFixed(1)}%` : '—'}</div><div className="mt-1 text-xs text-[#64748b]">正确率</div></div>
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button type="button" className="primary-button" onClick={onReplay}><RotateCcw size={18} />再练一遍</Button>
        {onReview && <Button type="button" variant="secondary" className="secondary-button" onClick={onReview}><BookOpen size={18} />{reviewSummary !== undefined ? '再练本轮错题' : '复习错题'}</Button>}
        {extraAction}
      </div>
      {saved && <p className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#16a34a]"><Check size={14} />学习进度已保存</p>}
    </section>
  );
}
