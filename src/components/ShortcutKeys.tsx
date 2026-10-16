'use client';

import {
  ArrowBigUp, Command, CornerDownLeft, Delete, Option, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useKeyboardPlatform } from '@/hooks/useKeyboardPlatform';

const keyIcons: Partial<Record<string, LucideIcon>> = {
  Shift: ArrowBigUp,
  Backspace: Delete,
  Enter: CornerDownLeft,
  Esc: X,
  Meta: Command,
};

export function ShortcutKeys({ keys, compact = false }: { keys: readonly string[]; compact?: boolean }) {
  const { isMac, keyLabel } = useKeyboardPlatform();
  const label = keys.map(keyLabel).join(' + ');

  return (
    <span role="img" aria-label={label} className={`inline-flex items-center ${compact ? 'gap-0.5' : 'gap-1.5'}`}>
      {keys.map((key, index) => {
        const Icon = key === 'Alt' && isMac ? Option : keyIcons[key];
        const previousIsModifier = keys[index - 1] === 'Alt' || keys[index - 1] === 'Shift';
        const showPlus = index > 0 && !(isMac && previousIsModifier);

        return (
          <span key={`${key}-${index}`} className="inline-flex items-center gap-1">
            {showPlus && <span aria-hidden="true" className="text-xs text-slate-400">+</span>}
            <kbd aria-hidden="true" className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1 font-sans text-xs font-semibold text-slate-700 shadow-sm ${compact ? 'h-5 min-w-5 text-[10px]' : ''}`}>
              {Icon ? <Icon size={compact ? 13 : 15} strokeWidth={2} /> : key === 'Tab' ? 'Tab' : keyLabel(key)}
            </kbd>
          </span>
        );
      })}
    </span>
  );
}
