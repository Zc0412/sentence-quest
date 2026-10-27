import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Settings } from 'lucide-react';
import type { PronunciationType } from '@/utils/speech';
import { Logo } from './Logo';
import { XpBadge } from './XpBadge';
import { Button } from './ui/button';

interface Props {
  settingsHref: string;
  xp: number;
  pronunciationType: PronunciationType;
  onPronunciationChange: (type: PronunciationType) => void;
  onShowActivity: () => void;
  extraAction?: ReactNode;
}

export function PracticeHeader({ settingsHref, xp, pronunciationType, onPronunciationChange, onShowActivity, extraAction }: Props) {
  return (
    <header className="app-header flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><Logo /></div>
      <div className="flex shrink-0 items-center gap-2">
        {extraAction}
        <Button asChild type="button" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-[#e2e8f0] bg-white text-[#475569] shadow-sm hover:bg-[#eff6ff]" aria-label="打开设置">
          <Link href={settingsHref}><Settings size={18} /></Link>
        </Button>
        <Button type="button" variant="outline" onClick={onShowActivity} className="flex h-auto items-center gap-1.5 rounded-2xl border-[#e2e8f0] bg-white px-2.5 py-2.5 text-[12px] font-bold text-[#475569] shadow-sm hover:bg-[#eff6ff] sm:px-3" aria-label="查看学习热力图">
          <CalendarDays size={17} /><span className="hidden sm:inline">学习统计</span>
        </Button>
        <div role="group" aria-label="发音口音" className="flex items-center rounded-2xl border border-[#e2e8f0] bg-white p-1 shadow-sm">
          {([['1', '英音'], ['2', '美音']] as const).map(([type, label]) => (
            <Button key={type} type="button" variant="ghost" aria-pressed={pronunciationType === type} onClick={() => onPronunciationChange(type)} className={`h-auto rounded-xl px-2 py-2 text-[12px] font-bold ${pronunciationType === type ? 'bg-[#dbeafe] text-[#2563eb]' : 'text-[#64748b] hover:text-[#0f172a]'}`}>{label}</Button>
          ))}
        </div>
        <XpBadge xp={xp} />
      </div>
    </header>
  );
}
