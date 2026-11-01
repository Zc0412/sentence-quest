const POOL_SIZE = 4;
const players: HTMLAudioElement[] = [];
let cursor = 0;

/** 进入练习页时预加载，避免第一次敲键才开始下载。 */
export function preloadKeySound(): void {
  if (typeof Audio === 'undefined') return;
  try {
    if (!players.length) {
      for (let index = 0; index < POOL_SIZE; index += 1) {
        const audio = new Audio('/sounds/key_web_click.wav');
        audio.volume = 0.4;
        audio.preload = 'auto';
        players.push(audio);
        audio.load();
      }
    }
  } catch { /* 浏览器禁用音频时仍可正常输入。 */ }
}

export function playKeySound(): void {
  preloadKeySound();
  if (!players.length) return;
  try {
    const audio = players[cursor];
    cursor = (cursor + 1) % players.length;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch { /* 浏览器禁用音频时仍可正常输入。 */ }
}
