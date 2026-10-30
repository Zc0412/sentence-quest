const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
const { navigationMetrics } = require('../../utils/navigation');
Page({
  data: { scrolled: false, statusBarHeight: 24, navigationHeight: 44, tab: 'detail', xp: 0, todayXp: 0, groups: [] },
  onLoad() { this.setData(navigationMetrics()); },
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
  onShow() {
    const state = storage.read();
    const today = storage.dateKey();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = storage.dateKey(yesterday);
    const groups = [];
    const history = Array.isArray(state.xpHistory) ? state.xpHistory : [];
    history.forEach((entry, index) => {
      if (!entry || !entry.date || !Number.isFinite(entry.amount) || entry.amount <= 0) return;
      let group = groups.find((item) => item.date === entry.date);
      if (!group) { group = { date: entry.date, title: entry.date === today ? '今天' : entry.date === yesterdayKey ? '昨天' : entry.date, total: 0, items: [] }; groups.push(group); }
      group.total += entry.amount;
      const list = lists.find((item) => item.id === entry.listId);
      const label = list ? list.label : '练习';
      const mainAmount = entry.perfect ? entry.amount - 5 : entry.amount;
      if (mainAmount > 0) group.items.push({ key: `${index}-base`, icon: '/assets/xp-check.svg', color: 'green', title: entry.review ? '复习错题' : list && list.kind === 'word' ? '完成一词' : '完成一句', description: `${label} · ${entry.time}`, amount: mainAmount });
      if (entry.perfect && entry.amount >= 5) group.items.push({ key: `${index}-bonus`, icon: '/assets/xp-star.svg', color: 'gold', title: '无提示奖励', description: '完全正确 · 未使用提示', amount: 5 });
    });
    this.setData({ xp: state.xp, todayXp: (state.xpDaily && state.xpDaily[today]) || 0, groups });
  },
  switchTab(event) { const tab = event.currentTarget.dataset.tab; if (tab === 'detail' || tab === 'rules') this.setData({ tab }); },
  back() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/profile/index' }) }); },
});
