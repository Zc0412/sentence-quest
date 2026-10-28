'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import type { XpEntry } from '@/types/xp-history';
import { XP_HISTORY_LIMIT } from '@/utils/xp-history';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const labels = { word: '单词', phrase: '短语', sentence: '句子' };
const dateFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export function XpBadge({ xp, entries = [], ready = true, warning = '' }: { xp: number; entries?: XpEntry[]; ready?: boolean; warning?: string }) {
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(20);
  const recorded = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const earlier = Math.max(0, xp - recorded);
  const filtered = entries.filter((entry) => filter === 'all' || entry.kind === filter);
  return (
    <Dialog onOpenChange={(open) => { if (open) { setFilter('all'); setVisible(20); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={!ready} className="h-auto gap-1.5 rounded-2xl border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-black text-ink shadow-sm hover:border-blue-200 hover:bg-blue-50" aria-label={`累计 ${xp} XP，查看获得明细`} title="查看 XP 获得明细">
          <Zap size={17} className="fill-[#fbbf24] text-[#f59e0b]" /> {xp} <span className="font-medium text-[#94a3b8]">XP</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <DialogTitle className="pr-10 text-xl font-bold">XP 获得明细</DialogTitle>
        <DialogDescription className="text-sm leading-6">首次完成 +10 XP，无错误且未使用提示额外 +5 XP。重复练习和错题复习不增加 XP。</DialogDescription>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-blue-50 p-4 text-center">
          <div><p className="text-xs text-slate-500">累计积分</p><p className="mt-1 font-bold text-blue-700">{xp} XP</p></div>
          <div><p className="text-xs text-slate-500">明细合计</p><p className="mt-1 font-bold text-slate-800">{recorded} XP</p></div>
          <div><p className="text-xs text-slate-500">较早积分</p><p className="mt-1 font-bold text-slate-800">{earlier} XP</p></div>
        </div>
        {warning && <p role="status" className="text-sm text-orange-700">{warning}</p>}
        {earlier > 0 && <p className="text-xs leading-5 text-slate-500">较早积分来自旧版本或超出保留范围的记录，无法还原具体时间与练习内容，已保留在累计积分中。</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">保留最近 {XP_HISTORY_LIMIT} 条获得记录</p>
          <Select value={filter} onValueChange={(value) => { setFilter(value); setVisible(20); }}>
            <SelectTrigger aria-label="筛选 XP 练习类型" className="h-10 w-28 shrink-0 rounded-xl border-slate-200 bg-white text-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="word">单词</SelectItem>
              <SelectItem value="phrase">短语</SelectItem>
              <SelectItem value="sentence">句子</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtered.length ? <ul className="divide-y divide-slate-100">
          {filtered.slice(0, visible).map((entry, index) => <li key={`${entry.at}:${index}`} className="py-4 first:pt-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><p className="break-words font-bold text-slate-800">{entry.text}</p>{entry.meaning && <p className="mt-1 break-words text-sm text-slate-500">{entry.meaning}</p>}</div>
              <span className="shrink-0 font-bold text-emerald-600">+{entry.amount} XP</span>
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-slate-500">{labels[entry.kind]} · {entry.sourceLabel || entry.listId}</p>
            <p className="mt-1 text-xs leading-5 text-blue-600">首次完成 +10{entry.perfect ? ' · 完美完成 +5' : ''}</p>
            <time dateTime={entry.at} className="mt-1 block text-xs text-slate-400">{dateFormat.format(new Date(entry.at))}</time>
          </li>)}
        </ul> : <p className="py-8 text-center text-sm text-slate-500">{entries.length ? '暂无此类型的 XP 获得记录。' : '暂无可展示的明细，之后获得 XP 时会自动记录。'}</p>}
        {visible < filtered.length && <Button variant="outline" onClick={() => setVisible((count) => count + 20)}>加载更多（剩余 {filtered.length - visible} 条）</Button>}
      </DialogContent>
    </Dialog>
  );
}
