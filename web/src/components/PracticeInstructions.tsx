import { ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface Props {
  mode: 'word' | 'sentence';
  onStart: () => void;
}

export function PracticeInstructions({ mode, onStart }: Props) {
  const steps = [
    { title: '看中文，回忆英文', detail: mode === 'word' ? '根据中文释义，想一想对应的英文单词。' : '根据中文提示，回忆英文表达。' },
    { title: '直接输入，逐字拼写', detail: mode === 'word' ? '字母即时反馈，拼对后稍作停留，再进入下一词。' : '逐词输入，拼对当前单词后自动进入下一词。' },
    { title: '听发音，灵活练习', detail: mode === 'word' ? '可播放发音、查看字母提示，或切换前后单词。' : '可播放发音、查看字母提示，完成后继续或再练一次。' },
  ];

  return (
    <DialogContent className="modal-content !max-w-[440px] !p-5 sm:!p-6">
      <div className="flex items-center gap-2 pr-9">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500"><Lightbulb size={17} /></span>
        <DialogTitle className="text-base font-semibold text-slate-900">玩法说明</DialogTitle>
      </div>
      <DialogDescription className="mt-2 text-xs leading-5 text-slate-500">看提示、练拼写，一词一跃积累英语。</DialogDescription>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">{index + 1}</span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold leading-5 text-slate-800">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p>
              {index === 1 && <p className="mt-1.5 text-xs leading-5 text-slate-500"><span className="font-medium text-slate-700">拼写不区分大小写，系统自动转换校验。</span><br />例如 Apple、apple、APPLE 均可，无需切换大小写。{mode === 'word' && <><br />词组中的空格会自动补齐，如 pencil box 可直接输入 pencilbox。</>}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">字母提示可在「设置 → 练习设置」开关，更多键盘操作见「快捷键」。</p>
      <Button type="button" className="mt-4 h-10 w-full rounded-xl text-sm" onClick={onStart}>明白了，开始练习 <ArrowRight size={16} /></Button>
    </DialogContent>
  );
}
