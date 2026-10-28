const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
const { navigationMetrics } = require('../../utils/navigation');
const { accuracy } = require('../../utils/typing-stats');
Page({
  data: { statusBarHeight: 24, navigationHeight: 44, completed: 0, total: 31, percent: 0, xp: 0, inputCount: 0, correctCount: 0, accuracy: '—', week: [], sharing: false },
  onLoad() { this.setData(navigationMetrics()); },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.syncSelected('stats');
    const state = storage.read();
    const completed = lists.reduce((sum, list) => sum + Math.min(list.wordCount, Object.keys(state.completed).filter((key) => key.startsWith(`${list.id}::`)).length), 0);
    const total = lists.reduce((sum, list) => sum + list.wordCount, 0);
    const typing = storage.typingStats();
    const today = new Date();
    const monday = new Date(today); monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
    const labels = ['一', '二', '三', '四', '五', '六', '日'];
    const week = labels.map((label, index) => {
      const date = new Date(monday); date.setDate(monday.getDate() + index);
      const key = storage.dateKey(date); const isToday = key === storage.dateKey(today);
      return { key, label: isToday ? '今天' : label, count: state.activity[key] || 0, today: isToday };
    });
    const maximum = Math.max(1, ...week.map((day) => day.count));
    this.setData({ completed, total, percent: Math.round(completed / total * 100), xp: state.xp, inputCount: typing.input, correctCount: typing.correct, accuracy: accuracy(typing), week: week.map((day) => Object.assign({}, day, { height: day.count ? Math.max(12, Math.round(day.count / maximum * 90)) : 6 })) });
  },
  poster() {
    if (this.data.sharing) return;
    this.setData({ sharing: true });
    const fail = () => { this.setData({ sharing: false }); wx.showToast({ title: '海报生成失败，请重试', icon: 'none' }); };
    try {
      const context = wx.createCanvasContext('stats-poster', this);
      const gradient = context.createLinearGradient(0, 0, 600, 800);
      gradient.addColorStop(0, '#dbeafe'); gradient.addColorStop(1, '#b9f5e9');
      context.setFillStyle(gradient); context.fillRect(0, 0, 600, 800);
      context.setFillStyle('#2f6fed'); context.setFontSize(28); context.fillText('句跃 SentLeap', 44, 68);
      context.setFillStyle('#0f172a'); context.setFontSize(38); context.fillText('每一次练习，都算数', 44, 140);
      context.setFillStyle('rgba(255,255,255,0.75)'); context.fillRect(36, 184, 528, 420);
      context.setFillStyle('#2f6fed'); context.setFontSize(74); context.fillText(`${this.data.percent}%`, 66, 282);
      context.setFillStyle('#475569'); context.setFontSize(24);
      context.fillText(`已掌握 ${this.data.completed} / ${this.data.total} 条表达`, 66, 338);
      context.fillText(`累计积分：${this.data.xp} XP`, 66, 394);
      context.fillText(`输入 ${this.data.inputCount} · 正确 ${this.data.correctCount}`, 66, 450);
      context.fillText(`输入正确率：${this.data.accuracy}`, 66, 506);
      const weekCount = this.data.week.reduce((sum, day) => sum + day.count, 0);
      context.fillText(`本周完成 ${weekCount} 次练习`, 66, 562);
      context.setFontSize(22); context.fillText('把英语，练成习惯。', 44, 688);
      context.setFontSize(18); context.fillText(storage.dateKey(), 44, 734);
      context.draw(false, () => wx.canvasToTempFilePath({ canvasId: 'stats-poster', width: 600, height: 800, destWidth: 1200, destHeight: 1600, success: ({ tempFilePath }) => { this.setData({ sharing: false }); wx.previewImage({ urls: [tempFilePath], current: tempFilePath }); }, fail }, this));
    } catch (_) { fail(); }
  },
});
