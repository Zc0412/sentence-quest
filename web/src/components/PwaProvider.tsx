'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getInstallPlatform, type InstallPlatform, type InstallPromptEvent } from '@/utils/pwa';

interface PwaState {
  ready: boolean;
  installed: boolean;
  canInstall: boolean;
  pending: boolean;
  secure: boolean;
  platform: InstallPlatform;
  message: string;
  install: () => Promise<void>;
}

const PwaContext = createContext<PwaState | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [pending, setPending] = useState(false);
  const [secure, setSecure] = useState(true);
  const [platform, setPlatform] = useState<InstallPlatform>('browser');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const isStandalone = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const displayChanged = () => setInstalled(isStandalone());
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
      setCanInstall(true);
      setMessage('');
    };
    const appInstalled = () => {
      promptRef.current = null;
      setInstalled(true);
      setCanInstall(false);
      setMessage('已安装，可以从桌面或主屏幕打开 SentLeap。');
    };
    setInstalled(isStandalone());
    setSecure(window.isSecureContext);
    setPlatform(getInstallPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setReady(true);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    standalone.addEventListener('change', displayChanged);

    // Development uses live assets and must not install a persistent worker.
    if (process.env.NODE_ENV === 'production' && window.isSecureContext && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error: unknown) => {
        console.warn('SentLeap offline fallback registration failed:', error);
      });
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', appInstalled);
      standalone.removeEventListener('change', displayChanged);
    };
  }, []);

  async function install() {
    const event = promptRef.current;
    if (!event || busy.current) return;
    busy.current = true;
    promptRef.current = null;
    setPending(true);
    setCanInstall(false);
    setMessage('');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(choice.outcome === 'accepted'
        ? '已确认安装，请按浏览器提示完成。'
        : '已取消安装，你仍可以继续使用网页版。');
    } catch {
      setMessage('暂时无法打开安装窗口，请使用浏览器菜单中的安装选项。');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <PwaContext.Provider value={{ ready, installed, canInstall, pending, secure, platform, message, install }}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error('usePwa must be used within PwaProvider');
  return context;
}
