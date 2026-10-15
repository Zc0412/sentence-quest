'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function ProgressFrame({ value, total, children }: { value: number; total: number; children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 104 });
  const completed = Math.min(Math.max(value, 0), Math.max(total, 0));
  const percent = total > 0 ? completed / total * 100 : 0;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const inset = 2;
  const radius = Math.max(0, Math.min(18, width / 2 - inset, height / 2 - inset));
  const right = width - inset;
  const bottom = height - inset;
  // 从顶部中央出发，按真实卡片尺寸顺时针绘制，进度按周长计算。
  const outline = `M ${width / 2} ${inset} H ${right - radius} A ${radius} ${radius} 0 0 1 ${right} ${inset + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset} ${bottom - radius} V ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset + radius} ${inset} Z`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 text-[12px] font-medium text-[#64748b]">
        <span>已掌握 <span className="font-bold tabular-nums text-[#3b82f6]">{completed}</span> / {total} 词</span>
        <span className="tabular-nums">{percent === 100 ? '全部完成' : `${Math.floor(percent)}%`}</span>
      </div>
      <div ref={frameRef} className="relative rounded-[20px] bg-[#f1f5f9]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" role="progressbar" aria-label="单词掌握进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`已掌握 ${completed} / ${total} 词`}>
          <path d={outline} fill="none" stroke="#e2e8f0" strokeWidth={3} />
          <path d={outline} pathLength={100} fill="none" stroke={percent === 100 ? '#22c55e' : '#3b82f6'} strokeWidth={3} strokeLinecap="round" strokeDasharray="100 100" strokeDashoffset={100 - percent} opacity={percent > 0 ? 1 : 0} className="transition-[stroke-dashoffset,stroke,opacity] duration-500 motion-reduce:transition-none" />
        </svg>
        {children}
      </div>
    </div>
  );
}
