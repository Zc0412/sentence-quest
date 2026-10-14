/**
 * Next.js 版发音：统一请求 /api/pronunciation，前端无需持有签名。
 * /api/pronunciation 默认重定向至有道 /pronounce/base。
 * 有道服务不可用时自动回退到浏览器 Web Speech API。
 */
let currentAudio: HTMLAudioElement | null = null;
let activePlayback = 0;
export type PronunciationType = '1' | '2';
let pronunciationType: PronunciationType = '1';

export function setPronunciationType(type: PronunciationType): void {
  pronunciationType = type;
}

export function stopSpeech(): void {
  activePlayback += 1;
  if (typeof window === 'undefined') return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute('src');
    currentAudio.load();
    currentAudio = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function wordAudioUrl(word: string): string {
  const params = new URLSearchParams({ word, type: pronunciationType });
  return `/api/pronunciation?${params.toString()}`;
}

function browserVoice(text: string, playbackId: number): void {
  if (typeof window === 'undefined' || playbackId !== activePlayback || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = pronunciationType === '1' ? 'en-GB' : 'en-US';
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

export function speakWord(word: string): void {
  if (!word || typeof window === 'undefined') return;
  stopSpeech();
  const playbackId = activePlayback;
  const audio = new Audio(wordAudioUrl(word));
  currentAudio = audio;
  audio.preload = 'none';
  let fallbackStarted = false;
  const fallback = () => {
    if (fallbackStarted || playbackId !== activePlayback) return;
    fallbackStarted = true;
    audio.onerror = null;
    audio.pause();
    if (currentAudio === audio) currentAudio = null;
    browserVoice(word, playbackId);
  };
  audio.onerror = fallback;
  audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
  void audio.play().catch(fallback);
}

export function speakEnglish(text: string): boolean {
  speakWord(text);
  return typeof window !== 'undefined';
}
