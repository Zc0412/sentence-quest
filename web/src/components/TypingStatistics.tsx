export function TypingStatistics({ input, correct }: { input: number; correct: number }) {
  return (
    <dl className="grid grid-cols-3 gap-2 px-4 py-5 text-center" aria-label="本次练习字母输入统计">
      <div><dt className="text-[12px] font-medium text-[#64748b]">输入数</dt><dd className="mt-1 text-xl font-bold tabular-nums text-ink">{input}</dd></div>
      <div><dt className="text-[12px] font-medium text-[#64748b]">正确数</dt><dd className="mt-1 text-xl font-bold tabular-nums text-[#22c55e]">{correct}</dd></div>
      <div><dt className="text-[12px] font-medium text-[#64748b]">正确率</dt><dd className="mt-1 text-xl font-bold tabular-nums text-[#14b8a6]">{input ? `${(correct / input * 100).toFixed(1)}%` : '—'}</dd></div>
    </dl>
  );
}
