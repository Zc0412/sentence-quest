import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { ProgressFrame } from './ProgressFrame';

interface Props {
  progress: number;
  total: number;
  navigation: ReactNode;
  promptLabel?: ReactNode;
  prompt?: string;
  promptDetails?: ReactNode;
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
  promptDetails,
  description,
  progressDetails,
  children,
}: Props) {
  return (
    <>
      {navigation}
      {prompt && <div className="sentence-prompt text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
          {promptLabel}
        </div>
        <h1 className="text-[27px] font-extrabold leading-[1.55] tracking-tight text-ink sm:text-[36px]">{prompt}</h1>
        {description && <p className="mt-4 text-[14px] text-[#64748b]">{description}</p>}
      </div>}
      {promptDetails}
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
