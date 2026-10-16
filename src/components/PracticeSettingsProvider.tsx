'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'sentleap-letter-hints-enabled';
const SettingsContext = createContext<{
  hintsEnabled: boolean;
  ready: boolean;
  warning: string;
  setHintsEnabled: (enabled: boolean) => void;
} | null>(null);

export function PracticeSettingsProvider({ children }: { children: ReactNode }) {
  const [hintsEnabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState('');
  useEffect(() => {
    try { setEnabled(localStorage.getItem(STORAGE_KEY) !== 'false'); }
    catch { setWarning('浏览器无法保存设置，本次选择仅在当前页面会话生效。'); }
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) setEnabled(event.newValue !== 'false');
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function setHintsEnabled(enabled: boolean) {
    setEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      setWarning('');
    } catch {
      setWarning('浏览器无法保存设置，本次选择仅在当前页面会话生效。');
    }
  }

  return <SettingsContext.Provider value={{ hintsEnabled, ready, warning, setHintsEnabled }}>{children}</SettingsContext.Provider>;
}

export function usePracticeSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('PracticeSettingsProvider is required');
  return settings;
}
