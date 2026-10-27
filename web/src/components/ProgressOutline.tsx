'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function ProgressOutline({ value, total, children }: { value: number; total: number; children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 400, radius: 29 });
  const completed = Math.min(Math.max(value, 0), total);
  const percent = total > 0 ? completed / total * 100 : 0;

  useEffect(() => {
    if (!frameRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.target.getBoundingClientRect();
      const card = entry.target.firstElementChild;
      const radius = card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) : 29;
      setSize({ width: rect.width, height: rect.height, radius });
    });
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const inset = 1.5;
  const radius = Math.max(0, size.radius - inset);
  const right = width - inset;
  const bottom = height - inset;
  const outline = `M ${width / 2} ${inset} H ${right - radius} A ${radius} ${radius} 0 0 1 ${right} ${inset + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset} ${bottom - radius} V ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset + radius} ${inset} Z`;

  return (
    <div ref={frameRef} className="relative">
      {children}
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          role="progressbar"
          aria-label="当前项目掌握进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Number(percent.toFixed(2))}
          aria-valuetext={`已掌握 ${completed} / ${total} 项`}
        >
          <path d={outline} fill="none" stroke="#e2e8f0" strokeWidth={3} />
          {completed > 0 && <path
            d={outline}
            pathLength={100}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={3}
            strokeLinecap="butt"
            strokeDasharray={`${percent} 100`}
            className="transition-[stroke-dasharray] duration-300 motion-reduce:transition-none"
          />}
        </svg>
    </div>
  );
}
