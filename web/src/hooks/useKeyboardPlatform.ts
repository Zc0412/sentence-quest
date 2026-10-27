'use client';

import { useEffect, useState } from 'react';

export function useKeyboardPlatform() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);
  const keyLabel = (key: string) => isMac
    ? ({ Alt: '⌥', Shift: '⇧', Tab: '⇥', Backspace: '⌫', Enter: '↩', Esc: '⎋', Control: '⌃', Ctrl: '⌃', Meta: '⌘', Space: '␣', Home: 'Fn + ←', End: 'Fn + →' }[key] ?? key)
    : key;
  return { isMac, keyLabel };
}
