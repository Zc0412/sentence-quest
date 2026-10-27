import { Zap } from 'lucide-react';

export function XpBadge({ xp }: { xp: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-black text-ink shadow-sm" aria-label={`累计 ${xp} XP`}>
      <Zap size={17} className="fill-[#fbbf24] text-[#f59e0b]" /> {xp} <span className="font-medium text-[#94a3b8]">XP</span>
    </div>
  );
}
