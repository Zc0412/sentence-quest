const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
const { navigationMetrics } = require('../../utils/navigation');
const { accuracy } = require('../../utils/typing-stats');
Page({
  data: { scrolled: false, statusBarHeight: 24, navigationHeight: 44, completed: 0, total: 31, percent: 0, xp: 0, inputCount: 0, correctCount: 0, accuracy: '—', week: [], sharing: false },
  onLoad() { this.setData(navigationMetrics()); },
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
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
  poster() { wx.navigateTo({ url: '/pages/share/index' }); },
});
