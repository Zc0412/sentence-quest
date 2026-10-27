import type { DailyActivity } from '../types/game';
import { Card } from './ui/card';

interface Props {
  activityByDate: Record<string, DailyActivity>;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function levelFor(activity: DailyActivity | undefined): number {
  const total = (activity?.words ?? 0) + (activity?.sentences ?? 0);
  if (total === 0) return 0;
  if (total < 4) return 1;
  if (total < 9) return 2;
  if (total < 16) return 3;
  return 4;
}

export function ActivityHeatmap({ activityByDate }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() - 52 * 7);
  const weeks = Array.from({ length: 53 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + weekIndex * 7 + dayIndex);
      const key = dateKey(date);
      return { date, key, activity: activityByDate[key], future: date > today };
    }),
  );
  const monthLabels = weeks.flatMap((week, index) => {
    const firstOfMonth = week.find((day) => day.date.getDate() === 1);
    return firstOfMonth ? [{ index, label: firstOfMonth.date.toLocaleDateString('zh-CN', { month: 'short' }) }] : [];
  });
  const totals = Object.values(activityByDate).reduce(
    (sum, activity) => ({
      words: sum.words + activity.words,
      sentences: sum.sentences + activity.sentences,
    }),
    { words: 0, sentences: 0 },
  );
  const activeDays = Object.values(activityByDate).filter((activity) => activity.words + activity.sentences > 0).length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="stat-tile"><strong className="block text-xl text-ink">{totals.words}</strong><span className="mt-1 block text-xs text-[#64748b]">完成单词</span></Card>
        <Card className="stat-tile"><strong className="block text-xl text-ink">{totals.sentences}</strong><span className="mt-1 block text-xs text-[#64748b]">完成句子</span></Card>
        <Card className="stat-tile"><strong className="block text-xl text-ink">{activeDays}</strong><span className="mt-1 block text-xs text-[#64748b]">学习天数</span></Card>
      </div>

      <div className="mt-6 overflow-x-auto pb-2" aria-label="近一年学习热力图">
        <div className="min-w-[690px]">
          <div className="mb-2 grid grid-cols-[26px_1fr] gap-2">
            <span />
            <div className="relative h-4">
              {monthLabels.map(({ index, label }) => (
                <span key={`${index}-${label}`} className="absolute text-[10px] text-[#64748b]" style={{ left: `calc(${(index / 53) * 100}% + 2px)` }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[26px_1fr] gap-2">
            <div className="grid grid-rows-7 gap-[3px] text-[9px] text-[#64748b]">
              <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
              {weeks.flatMap((week) => week.map(({ date, key, activity, future }) => {
                const words = activity?.words ?? 0;
                const sentences = activity?.sentences ?? 0;
                const label = `${key}：完成 ${words} 个单词、${sentences} 个句子`;
                return (
                  <div
                    key={key}
                    title={future ? '' : label}
                    aria-label={future ? undefined : label}
                    aria-hidden={future || undefined}
                    className={`h-[10px] w-[10px] rounded-[3px] ${future ? 'invisible' : `activity-level-${levelFor(activity)}`}`}
                  />
                );
              }))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748b]">
        <span>每天完成练习后自动统计</span>
        <div className="flex items-center gap-1.5" aria-label="学习数量图例">
          <span>少</span>
          {[0, 1, 2, 3, 4].map((level) => <span key={level} className={`h-[10px] w-[10px] rounded-[3px] activity-level-${level}`} />)}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
