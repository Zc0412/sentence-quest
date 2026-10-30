const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
const { navigationMetrics } = require('../../utils/navigation');
const reasonLabels = { error: '拼错', hint: '用了提示', skip: '跳过' };
Page({
  data: { items: [], scrolled: false, statusBarHeight: 24, navigationHeight: 44 },
  onLoad() { this.setData(navigationMetrics()); },
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
  onShow() {
    const mistakes = storage.read().mistakes;
    this.setData({ items: Object.keys(mistakes).filter((key) => lists.some((list) => list.id === mistakes[key].listId)).map((key) => {
      const entry = mistakes[key];
      return { key, zh: entry.item.zh, english: entry.item.english, isWord: lists.some((list) => list.id === entry.listId && list.kind === 'word'), reason: reasonLabels[entry.reason] ? entry.reason : '', reasonLabel: reasonLabels[entry.reason] || '待复习' };
    }) });
  },
  back() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/profile/index' }) }); },
  learn() { wx.switchTab({ url: '/pages/learn/index' }); },
  start() { if (this.data.items.length) wx.navigateTo({ url: '/pages/practice/index?review=1' }); },
});
