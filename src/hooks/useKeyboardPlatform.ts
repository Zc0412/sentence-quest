'use client';

import { useEffect, useState } from 'react';

export function useKeyboardPlatform() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);
  const keyLabel = (key: string) => isMac
    ? ({ Alt: '⌥ Option', Shift: '⇧ Shift', Tab: '⇥ Tab', Backspace: '⌫ Delete', Enter: '↩ Return', Esc: '⎋ Esc', Control: '⌃ Control', Ctrl: '⌃ Control', Meta: '⌘ Command', Space: '␣ Space', Home: 'Fn + ←', End: 'Fn + →' }[key] ?? key)
    : key;
  return { isMac, keyLabel };
}
