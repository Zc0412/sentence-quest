import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  kind: 'word' | 'phrase';
  meaning: string;
  review?: boolean;
  previous?: { label: string; onSelect: () => void };
  next?: { label: string; onSelect: () => void };
  children?: ReactNode;
}

export function PracticeNavigation({ kind, meaning, review = false, previous, next, children }: Props) {
  return (
    <div className="-mx-2 mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-2 sm:-mx-8 sm:gap-4">
      <Button type="button" variant="ghost" onClick={previous?.onSelect} disabled={!previous} className="text-action h-auto min-w-0 w-fit max-w-full justify-self-start justify-start px-0 sm:max-w-48 sm:px-2">
        <ChevronLeft size={17} className="shrink-0" /><span className="truncate">{previous ? `上一个：${previous.label}` : '已经是第一个'}</span>
      </Button>
      <div className="min-w-0 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#64748b]"><Sparkles size={15} className="text-[#fbbf24]" />{`${review ? 'REVIEW' : 'TYPE'} THIS ${kind === 'word' ? 'WORD' : 'PHRASE'}`}</div>
        <h1 className="break-words text-base font-bold leading-relaxed text-ink sm:text-2xl">{meaning}</h1>
        {children}
      </div>
      <Button type="button" variant="ghost" onClick={next?.onSelect} disabled={!next} className="text-action h-auto min-w-0 w-fit max-w-full justify-self-end justify-end px-0 sm:max-w-48 sm:px-2">
        <span className="truncate">{next ? `下一个：${next.label}` : '已经是最后一个'}</span><ChevronRight size={17} className="shrink-0" />
      </Button>
    </div>
  );
}
