export const gradeLabels = [
  '一年级', '二年级', '三年级', '四年级', '五年级',
  '六年级', '七年级', '八年级', '九年级',
];

/** 只归类明确的一至九年级；“三年级起点”表示教材体系，不是当前年级。 */
export function youthGrade(list: { category: string; label: string; description: string }): string | undefined {
  if (list.category !== '青少年英语') return undefined;
  const text = `${list.label} ${list.description}`.replace(/[一二三四五六七八九1-9]年级起点/g, '');
  const match = text.match(/([一二三四五六七八九1-9])年级/);
  if (!match) return undefined;
  const index = '一二三四五六七八九'.indexOf(match[1]);
  return gradeLabels[index >= 0 ? index : Number(match[1]) - 1];
}
