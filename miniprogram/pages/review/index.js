const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
Page({
  data: { items: [], xp: 0 },
  onShow() {
    this.setData({ xp: storage.read().xp, items: Object.keys(storage.read().mistakes).filter((key) => lists.some((list) => list.id === storage.read().mistakes[key].listId)).map((key) => {
      const entry = storage.read().mistakes[key];
      return { key, zh: entry.item.zh, english: entry.item.english, label: (lists.find((list) => list.id === entry.listId) || {}).label || '练习' };
    }) });
  },
  learn() { wx.switchTab({ url: '/pages/learn/index' }); },
  start() { wx.navigateTo({ url: '/pages/practice/index?review=1' }); },
});
