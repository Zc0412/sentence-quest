'use client';

import { ShortcutKeys } from './ShortcutKeys';

export function ShortcutHint({ letter }: { letter: 'P' | 'H' | 'N' }) {
  return <span className="ml-1 opacity-70"><ShortcutKeys keys={['Alt', letter]} compact /></span>;
}
