// 按键音效：每种声音使用四个播放器轮换，支持快速连续输入。
const STORAGE_KEY = 'keySoundOn';
const POOL_SIZE = 4;
const SOUNDS = { key: '/sounds/key_ios.wav', del: '/sounds/key_ios_delete.wav' };
let enabled = true;
try {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (typeof stored === 'boolean') enabled = stored;
} catch (_) { /* 无法读取时仍可正常练习。 */ }
const pools: Record<string, WechatMiniprogram.InnerAudioContext[]> = {};
const cursor = {};

function init() {
  Object.keys(SOUNDS).forEach((name) => {
    if (pools[name]) return;
    const pool = [];
    try {
      for (let index = 0; index < POOL_SIZE; index += 1) {
        const ctx = wx.createInnerAudioContext();
        pool.push(ctx);
        ctx.onError(() => {});
        ctx.obeyMuteSwitch = true;
        ctx.volume = 0.1;
        ctx.src = SOUNDS[name];
      }
      pools[name] = pool;
      cursor[name] = 0;
    } catch (_) { pool.forEach((ctx) => ctx.destroy()); }
  });
}
function stop() {
  Object.values(pools).forEach((pool) => pool.forEach((ctx) => ctx.stop()));
}
function play(name = 'key') {
  if (!enabled || !Object.prototype.hasOwnProperty.call(SOUNDS, name)) return;
  init();
  if (!pools[name]) return;
  const ctx = pools[name][cursor[name]];
  cursor[name] = (cursor[name] + 1) % POOL_SIZE;
  ctx.stop();
  ctx.play();
}
function setEnabled(value) {
  enabled = !!value;
  if (!enabled) stop();
  try { wx.setStorageSync(STORAGE_KEY, enabled); }
  catch (_) { wx.showToast({ title: '音效设置保存失败，请稍后重试', icon: 'none' }); }
}
function isEnabled() { return enabled; }
export default { init, play, stop, setEnabled, isEnabled };
