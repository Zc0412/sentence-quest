const POOL_SIZE = 4;
const players: HTMLAudioElement[] = [];
let cursor = 0;

/** 仅在用户输入时创建播放器；音频失败不影响拼写。 */
export function playKeySound(): void {
  if (typeof Audio === 'undefined') return;
  try {
    if (!players.length) {
      for (let index = 0; index < POOL_SIZE; index += 1) {
        const audio = new Audio('/sounds/key_web_click.wav');
        audio.volume = 0.1;
        audio.preload = 'auto';
        players.push(audio);
      }
    }
    const audio = players[cursor];
    cursor = (cursor + 1) % players.length;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch { /* 浏览器禁用音频时仍可正常输入。 */ }
}
