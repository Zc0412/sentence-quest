interface Props {
  value: number;
  total: number;
  label?: string;
}

export function ProgressBar({ value, total, label }: Props) {
  const pct = total ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-600">{label}</span>
          <span className="font-bold text-ink">{value} <span className="font-normal text-slate-400">/ {total}</span></span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-[#efedf7]" role="progressbar" aria-label={label ?? '学习进度'} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#8e78ea] to-[#7860df] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
