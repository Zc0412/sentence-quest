import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { ProgressFrame } from './ProgressFrame';

interface Props {
  progress: number;
  total: number;
  navigation: ReactNode;
  promptLabel: ReactNode;
  prompt: string;
  description?: string;
  progressDetails?: ReactNode;
  children: ReactNode;
}

export function ExercisePrompt({
  progress,
  total,
  navigation,
  promptLabel,
  prompt,
  description,
  progressDetails,
  children,
}: Props) {
  return (
    <>
      {navigation}
      <div className="sentence-prompt text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#a09ab4]">
          {promptLabel}
        </div>
        <h1 className="text-[27px] font-extrabold leading-[1.55] tracking-tight text-ink sm:text-[36px]">{prompt}</h1>
        {description && <p className="mt-4 text-[14px] text-[#a39ab5]">{description}</p>}
      </div>
      {children}
      <div className="mx-auto mt-auto w-full max-w-3xl shrink-0 pt-4">
        {progressDetails ? (
          <ProgressFrame value={progress} total={total}>{progressDetails}</ProgressFrame>
        ) : (
          <ProgressBar value={progress} total={total} />
        )}
      </div>
    </>
  );
}
