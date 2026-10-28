const { lists, bundled } = require('../../utils/catalog');
const storage = require('../../utils/storage');
Page({
  data: { lists: [], lastLabel: '', lastSentence: '', lastCompleted: 0, lastTotal: 0, accent: '1', statusBarHeight: 24, navigationHeight: 44 },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const capsule = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = info.statusBarHeight || 24;
    this.setData({ statusBarHeight, navigationHeight: capsule.height && capsule.top >= statusBarHeight ? (capsule.top - statusBarHeight) * 2 + capsule.height : 44 });
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.syncSelected('learn');
    this.refresh();
  },
  refresh() {
    const state = storage.read();
    const current = lists.find((list) => list.id === state.lastList) || lists[0];
    const counts = {};
    Object.keys(state.completed).forEach((key) => { const id = key.split('::')[0]; counts[id] = (counts[id] || 0) + 1; });
    const rows = bundled[current.id];
    const cursor = Math.max(0, Math.min(state.cursors[current.id] || 0, rows.length - 1));
    this.setData({
      lastLabel: current.label, lastSentence: rows[cursor].zh,
      lastCompleted: Math.min(counts[current.id] || 0, current.wordCount), lastTotal: current.wordCount,
      accent: state.settings.accent,
      lists: lists.map((list) => Object.assign({}, list, {
        completed: Math.min(counts[list.id] || 0, list.wordCount),
        percent: Math.min(100, Math.round((counts[list.id] || 0) / list.wordCount * 100)),
      })),
    });
  },
  accent(event) { const accent = event.currentTarget.dataset.value; storage.settings({ accent }); this.setData({ accent }); },
  open(event) { wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent(event.currentTarget.dataset.id)}` }); },
  resume() { wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent((lists.find((list) => list.id === storage.read().lastList) || lists[0]).id)}` }); },
});
