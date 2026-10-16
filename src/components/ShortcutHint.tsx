'use client';

import { useKeyboardPlatform } from '@/hooks/useKeyboardPlatform';

export function ShortcutHint({ letter }: { letter: 'P' | 'H' | 'N' }) {
  const { isMac, keyLabel } = useKeyboardPlatform();
  return <kbd className="ml-1 rounded border border-slate-200 px-1 py-0.5 font-sans text-[10px] font-normal opacity-60">{keyLabel('Alt')}{isMac ? '' : ' + '}{letter}</kbd>;
}
