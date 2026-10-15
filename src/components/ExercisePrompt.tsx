import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { Badge } from './ui/badge';

interface Props {
  badge: string;
  position: string;
  progress: number;
  total: number;
  promptLabel: ReactNode;
  prompt: string;
  description: string;
  children: ReactNode;
}

export function ExercisePrompt({
  badge,
  position,
  progress,
  total,
  promptLabel,
  prompt,
  description,
  children,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary" className="rounded-full border-transparent bg-[#f3f0ff] px-3.5 py-1.5 text-[11px] font-black tracking-[0.12em] text-[#8a70e4]">{badge}</Badge>
        <span className="text-[13px] font-bold text-[#aaa2bb]">{position}</span>
      </div>
      <div className="mt-4">
        <ProgressBar value={progress} total={total} />
      </div>
      <div className="sentence-prompt text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#a09ab4]">
          {promptLabel}
        </div>
        <h1 className="text-[27px] font-extrabold leading-[1.55] tracking-tight text-ink sm:text-[36px]">{prompt}</h1>
        <p className="mt-4 text-[14px] text-[#a39ab5]">{description}</p>
      </div>
      {children}
    </>
  );
}
