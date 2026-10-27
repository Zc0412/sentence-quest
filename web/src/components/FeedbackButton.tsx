'use client';

import { createId } from '@/utils/id';

import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, MessageSquarePlus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submission = useRef<{ payload: string; id: string } | null>(null);
  const submitting = useRef(false);
  const fieldClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const data = { type, content: content.trim(), contact: contact.trim(), page: window.location.pathname };
      const payload = JSON.stringify(data);
      if (submission.current?.payload !== payload) submission.current = { payload, id: createId() };
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: submission.current.id }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || '提交失败，请稍后重试。');
      setSuccess(true);
      setContent('');
      setContact('');
      submission.current = null;
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' && cause.name !== 'TypeError' ? cause.message : '网络连接失败，请稍后重试；填写内容已保留。');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (pending) return; setOpen(next); if (next) { setSuccess(false); setError(''); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" aria-label="意见反馈" className="group fixed right-4 z-40 h-11 gap-0 rounded-full border-blue-100 bg-white px-[13px] text-blue-600 shadow-lg hover:bg-blue-50 sm:right-6" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <MessageSquarePlus size={18} className="shrink-0" /><span aria-hidden="true" className="max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-12 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-12 group-focus-visible:opacity-100 motion-reduce:transition-none">反馈</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white p-6">
        <DialogTitle className="pr-10 text-xl font-bold text-slate-900">意见反馈</DialogTitle>
        <DialogDescription>遇到问题或有新的想法？告诉我们，帮助 SentLeap 变得更好。</DialogDescription>
        {success ? (
          <div className="space-y-5 py-4 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="font-semibold text-slate-800">反馈已收到，谢谢你的建议！</p>
            <Button onClick={() => setOpen(false)} className="w-full">完成</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
              <div>
                <label htmlFor="feedback-type" className="block text-sm font-medium text-slate-700">反馈类型</label>
                <Select value={type} onValueChange={setType} disabled={pending}>
                  <SelectTrigger id="feedback-type" className={`${fieldClass} h-11`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">问题反馈</SelectItem>
                    <SelectItem value="suggestion">功能建议</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="block text-sm font-medium text-slate-700">反馈内容 <span className="text-slate-400">（必填）</span>
                <textarea required maxLength={2000} rows={5} value={content} onChange={(event) => setContent(event.target.value)} placeholder="请描述遇到的问题，或你希望增加的功能…" className={`${fieldClass} resize-y`} />
                <span className="mt-1 block text-right text-xs text-slate-400">{content.length} / 2000</span>
              </label>
              <label className="block text-sm font-medium text-slate-700">联系方式 <span className="text-slate-400">（选填）</span>
                <input maxLength={200} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="邮箱或其他联系方式，方便我们回复" className={fieldClass} />
              </label>
            </fieldset>
            <p className="text-xs leading-5 text-slate-500">提交时会附带当前页面路径，仅用于排查问题和处理反馈。请勿填写密码等敏感信息。</p>
            {error && <p role="alert" className="text-sm text-orange-700">{error}</p>}
            <Button type="submit" disabled={pending || !content.trim()} className="h-11 w-full rounded-xl">
              {pending && <Loader2 className="animate-spin" />}{pending ? '正在提交…' : '提交反馈'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
