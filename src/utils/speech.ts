/**
 * Next.js 版发音：统一请求 /api/pronunciation，前端无需持有签名。
 * /api/pronunciation 默认重定向至有道 /pronounce/base。
 * 有道服务不可用时自动回退到浏览器 Web Speech API。
 */
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let activePlayback = 0;
export type PronunciationType = '1' | '2';
let pronunciationType: PronunciationType = '1';
const pronunciationCache = new Map<string, Blob>();
const pendingPronunciations = new Map<string, Promise<Blob>>();
const MAX_CACHED_AUDIO_COUNT = 64;
const MAX_CACHED_AUDIO_BYTES = 16 * 1024 * 1024;
let cachedAudioBytes = 0;

export function setPronunciationType(type: PronunciationType): void {
  pronunciationType = type;
}

function releaseAudio(): void {
  if (currentAudio) {
    currentAudio.onerror = null;
    currentAudio.onended = null;
    currentAudio.pause();
    currentAudio.removeAttribute('src');
    currentAudio.load();
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export function stopSpeech(): void {
  activePlayback += 1;
  if (typeof window === 'undefined') return;
  releaseAudio();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function wordAudioUrl(word: string, type: PronunciationType = pronunciationType): string {
  const params = new URLSearchParams({ word, type });
  return `/api/pronunciation?${params.toString()}`;
}

export async function loadPronunciationAudio(word: string, type: PronunciationType = pronunciationType): Promise<Blob> {
  const key = `${type}:${word}`;
  const cached = pronunciationCache.get(key);
  if (cached) {
    pronunciationCache.delete(key);
    pronunciationCache.set(key, cached);
    return cached;
  }
  const pending = pendingPronunciations.get(key);
  if (pending) return pending;

  const request = fetch(wordAudioUrl(word, type))
    .then(async (response) => {
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('audio/')) {
        throw new Error('发音接口未返回有效音频');
      }
      const audio = await response.blob();
      if (audio.size <= MAX_CACHED_AUDIO_BYTES) {
        while (pronunciationCache.size >= MAX_CACHED_AUDIO_COUNT
          || cachedAudioBytes + audio.size > MAX_CACHED_AUDIO_BYTES) {
          const oldest = pronunciationCache.keys().next();
          if (oldest.done) break;
          const removed = pronunciationCache.get(oldest.value);
          pronunciationCache.delete(oldest.value);
          cachedAudioBytes -= removed?.size ?? 0;
        }
        pronunciationCache.set(key, audio);
        cachedAudioBytes += audio.size;
      }
      return audio;
    })
    .finally(() => pendingPronunciations.delete(key));
  pendingPronunciations.set(key, request);
  return request;
}

function browserVoice(text: string, type: PronunciationType, playbackId: number): void {
  if (typeof window === 'undefined' || playbackId !== activePlayback || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = type === '1' ? 'en-GB' : 'en-US';
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

export function speakWord(word: string): void {
  if (!word || typeof window === 'undefined') return;
  stopSpeech();
  const playbackId = activePlayback;
  const type = pronunciationType;
  void loadPronunciationAudio(word, type).then((blob) => {
    if (playbackId !== activePlayback) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    currentAudioUrl = url;
    const fallback = () => {
      if (playbackId !== activePlayback || currentAudio !== audio) return;
      releaseAudio();
      browserVoice(word, type, playbackId);
    };
    audio.onerror = fallback;
    audio.onended = () => {
      if (currentAudio === audio) releaseAudio();
    };
    void audio.play().catch(fallback);
  }).catch(() => browserVoice(word, type, playbackId));
}

export function speakEnglish(text: string): boolean {
  speakWord(text);
  return typeof window !== 'undefined';
}
