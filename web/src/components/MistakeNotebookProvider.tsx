'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { MistakeNotebook, MistakeSnapshot } from '@/types/mistake-notebook';
import { EMPTY_NOTEBOOK, clearMistakes, importMistakes, markMistake, recordMistake, reviewMistake } from '@/utils/mistake-notebook';
import { transactNotebook } from '@/repositories/mistake-notebook';
import { createId } from '@/utils/id';
import { normalizeReviewSession, type ReviewSession } from '@/utils/review-session';

type Update = (state: MistakeNotebook) => MistakeNotebook;
interface ContextValue {
  state: MistakeNotebook;
  ready: boolean;
  warning: string;
  record: (item: MistakeSnapshot) => void;
  review: (id: string, perfect: boolean) => void;
  mark: (id: string, consolidated: boolean) => void;
  importLegacy: (items: MistakeSnapshot[]) => Promise<void>;
  clear: (listId?: string, itemIds?: string[]) => void;
  createSession: (ids: string[], returnHref: string) => string;
  readSession: (id: string) => ReviewSession | null;
}
const Context = createContext<ContextValue | null>(null);

export function MistakeNotebookProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MistakeNotebook>(EMPTY_NOTEBOOK);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState('');
  const current = useRef(state);
  const memory = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const channel = useRef<BroadcastChannel | null>(null);
  const sessions = useRef<Record<string, ReviewSession>>({});
  const apply = useCallback((next: MistakeNotebook) => { current.current = next; setState(next); }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      queue.current = queue.current.then(async () => {
        if (!active || memory.current) return;
        try { const next = await transactNotebook(); if (active) apply(next); }
        catch { if (active) { memory.current = true; setWarning('错题本暂时仅保存在当前页面，刷新可能丢失，请检查浏览器存储权限。'); } }
        finally { if (active) setReady(true); }
      });
    };
    refresh();
    if ('BroadcastChannel' in window) {
      try { channel.current = new BroadcastChannel('sentleap-mistakes'); channel.current.onmessage = refresh; } catch { /* Focus refresh is available. */ }
    }
    window.addEventListener('focus', refresh);
    return () => { active = false; channel.current?.close(); channel.current = null; window.removeEventListener('focus', refresh); };
  }, [apply]);

  const mutate = useCallback((update: Update): Promise<void> => {
    const job = queue.current.then(async () => {
      let next: MistakeNotebook;
      if (memory.current) next = update(current.current);
      else {
        try { next = await transactNotebook(update); }
        catch { memory.current = true; setWarning('错题本保存失败，当前变更仅保存在页面内存中。'); next = update(current.current); }
      }
      apply(next);
      try { channel.current?.postMessage('updated'); } catch { /* Optional cross-tab notification. */ }
    });
    queue.current = job.catch(() => {});
    return job;
  }, [apply]);
  const record = useCallback((item: MistakeSnapshot) => { const at = new Date().toISOString(); void mutate((old) => recordMistake(old, item, at)); }, [mutate]);
  const review = useCallback((id: string, perfect: boolean) => { const at = new Date().toISOString(); void mutate((old) => reviewMistake(old, id, perfect, at)); }, [mutate]);
  const mark = useCallback((id: string, consolidated: boolean) => { void mutate((old) => markMistake(old, id, consolidated)); }, [mutate]);
  const importLegacy = useCallback((items: MistakeSnapshot[]) => mutate((old) => importMistakes(old, items)), [mutate]);
  const clear = useCallback((listId?: string, itemIds?: string[]) => { void mutate((old) => clearMistakes(old, listId, itemIds)); }, [mutate]);
  const createSession = useCallback((ids: string[], returnHref: string) => {
    const session = normalizeReviewSession({ ids, returnHref });
    if (!session) throw new Error('无效的复习队列');
    const id = createId();
    sessions.current[id] = session;
    try { sessionStorage.setItem(`sentleap-review:${id}`, JSON.stringify(session)); } catch { /* In-memory navigation still works. */ }
    return id;
  }, []);
  const readSession = useCallback((id: string) => {
    if (sessions.current[id]) return sessions.current[id];
    try {
      const session = normalizeReviewSession(JSON.parse(sessionStorage.getItem(`sentleap-review:${id}`) ?? 'null'));
      if (session) sessions.current[id] = session;
      return session;
    } catch { return null; }
  }, []);
  return <Context.Provider value={{ state, ready, warning, record, review, mark, importLegacy, clear, createSession, readSession }}>{children}</Context.Provider>;
}

export function useMistakeNotebook() {
  const context = useContext(Context);
  if (!context) throw new Error('MistakeNotebookProvider is required');
  return context;
}
