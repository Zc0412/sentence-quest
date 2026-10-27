import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { PracticeSettingsProvider } from '@/components/PracticeSettingsProvider';
import { LearningHistoryProvider } from '@/components/LearningHistoryProvider';
import { FeedbackButton } from '@/components/FeedbackButton';
import { MistakeNotebookProvider } from '@/components/MistakeNotebookProvider';

export const metadata: Metadata = {
  title: 'SentLeap | 一词一跃，玩会英语',
  description: '看中文，逐词输入英文，像玩游戏一样练习英语句子。',
  applicationName: 'SentLeap',
  icons: {
    icon: '/sentleap-app-icon.png',
    apple: '/sentleap-app-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><PracticeSettingsProvider><LearningHistoryProvider><MistakeNotebookProvider>{children}<FeedbackButton /></MistakeNotebookProvider></LearningHistoryProvider></PracticeSettingsProvider></body>
    </html>
  );
}
