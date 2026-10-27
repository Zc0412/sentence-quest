const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
Page({
  data: { items: [] },
  onShow() {
    this.setData({ items: Object.keys(storage.read().mistakes).map((key) => {
      const entry = storage.read().mistakes[key];
      return { key, zh: entry.item.zh, english: entry.item.english, label: (lists.find((list) => list.id === entry.listId) || {}).label || '练习' };
    }) });
  },
  start() { wx.navigateTo({ url: '/pages/practice/index?review=1' }); },
});
