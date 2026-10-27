'use client';

import { useMemo, type ReactNode } from 'react';
import { ProgressOutline } from './ProgressOutline';
import type { ProgressItem } from '@/utils/progress-ring';

export function ProgressFrame({ items, children, itemLabel = '词' }: { items: ProgressItem[]; children: ReactNode; itemLabel?: string }) {
  const total = items.length;
  const completed = useMemo(() => items.filter((item) => item.completed).length, [items]);
  const percent = total > 0 ? completed / total * 100 : 0;

  return (
    <div className="pb-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[12px] font-medium text-slate-500">
        <span>已掌握 <span className="font-bold tabular-nums text-blue-500">{completed}</span> / {total} {itemLabel}</span>
        <span>{Math.floor(percent)}%</span>
      </div>
      <ProgressOutline value={completed} total={total}>
        <div className="rounded-[20px] bg-slate-50 p-4">
          {children}
        </div>
      </ProgressOutline>
    </div>
  );
}
