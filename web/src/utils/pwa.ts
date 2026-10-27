export type InstallPlatform = 'ios' | 'mac' | 'browser' | 'embedded';

export function getInstallPlatform(userAgent: string, maxTouchPoints: number): InstallPlatform {
  if (/MicroMessenger|FBAN|FBAV|Instagram/i.test(userAgent)) return 'embedded';
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  if (/Macintosh/i.test(userAgent) && /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR/i.test(userAgent)) return 'mac';
  return 'browser';
}

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
