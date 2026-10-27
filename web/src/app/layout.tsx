import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { PracticeSettingsProvider } from '@/components/PracticeSettingsProvider';
import { LearningHistoryProvider } from '@/components/LearningHistoryProvider';
import { FeedbackButton } from '@/components/FeedbackButton';
import { MistakeNotebookProvider } from '@/components/MistakeNotebookProvider';
import { PwaProvider } from '@/components/PwaProvider';

export const metadata: Metadata = {
  title: 'SentLeap | 一词一跃，玩会英语',
  description: '看中文，逐词输入英文，像玩游戏一样练习英语句子。',
  applicationName: 'SentLeap',
  appleWebApp: { capable: true, title: 'SentLeap', statusBarStyle: 'default' },
  icons: {
    icon: '/sentleap-app-icon.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f8fc',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><PwaProvider><PracticeSettingsProvider><LearningHistoryProvider><MistakeNotebookProvider>{children}<FeedbackButton /></MistakeNotebookProvider></LearningHistoryProvider></PracticeSettingsProvider></PwaProvider></body>
    </html>
  );
}
