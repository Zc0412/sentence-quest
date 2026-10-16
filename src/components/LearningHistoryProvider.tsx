'use client';

import { createId } from '@/utils/id';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LearningEntry, LearningKind, LearningHistory } from '@/types/learning-history';
import { EMPTY_HISTORY, recordLearning } from '@/utils/learning-history';
import { transactHistory } from '@/repositories/learning-history';

type Update = (state: LearningHistory) => LearningHistory;
interface HistoryContextValue {
  state: LearningHistory;
  ready: boolean;
  warning: string;
  record: (kind: LearningKind, text: string, meaning: string) => void;
}
const Context = createContext<HistoryContextValue | null>(null);

export function LearningHistoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearningHistory>(EMPTY_HISTORY);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState('');
  const current = useRef(state);
  const memory = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const channel = useRef<BroadcastChannel | null>(null);
  const apply = useCallback((next: LearningHistory) => { current.current = next; setState(next); }, []);

  useEffect(() => {
    let active = true;
    queue.current = queue.current.then(async () => {
      try { const next = await transactHistory(); if (active) apply(next); }
      catch { if (active) { memory.current = true; setWarning('学习轨迹暂时仅保存在内存中，刷新可能丢失。请检查浏览器存储权限。'); } }
      finally { if (active) setReady(true); }
    });
    const refresh = () => {
      queue.current = queue.current.then(async () => {
        if (!active || memory.current) return;
        try { const next = await transactHistory(); if (active) apply(next); } catch { /* Retain current data. */ }
      });
    };
    if ('BroadcastChannel' in window) {
      try { channel.current = new BroadcastChannel('sentleap-rewards'); channel.current.onmessage = refresh; } catch { /* Focus refresh remains available. */ }
    }
    window.addEventListener('focus', refresh);
    return () => { active = false; channel.current?.close(); channel.current = null; window.removeEventListener('focus', refresh); };
  }, [apply]);

  const mutate = useCallback((update: Update) => {
    const job = queue.current.then(async () => {
      let next: LearningHistory;
      if (memory.current) next = update(current.current);
      else {
        try { next = await transactHistory(update); }
        catch { memory.current = true; setWarning('学习轨迹保存失败，当前变更仅保存在内存中，刷新可能丢失。'); next = update(current.current); }
      }
      apply(next);
      try { channel.current?.postMessage('updated'); } catch { /* Optional cross-tab notification. */ }
    });
    queue.current = job.catch(() => {});
    return job;
  }, [apply]);

  const record = useCallback((kind: LearningKind, text: string, meaning: string) => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const entry: LearningEntry = { id: createId(), kind, text, meaning, at: now.toISOString(), day };
    void mutate((old) => recordLearning(old, entry));
  }, [mutate]);

  return <Context.Provider value={{ state, ready, warning, record }}>{children}</Context.Provider>;
}

export function useLearningHistory() {
  const context = useContext(Context);
  if (!context) throw new Error('LearningHistoryProvider is required');
  return context;
}
