const { lists, bundled, cached } = require('../../utils/catalog');
const storage = require('../../utils/storage');
const { libraryItems, recentIds } = require('../../utils/library-list');
Page({
  data: { scrolled: false, hasProgress: false, sampleWords: [], firstLabel: '精选短语', firstTotal: 0, firstSentence: '', lists: [], lastLabel: '', lastSentence: '', lastCompleted: 0, lastTotal: 0, statusBarHeight: 24, navigationHeight: 44 },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const capsule = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = info.statusBarHeight || 24;
    this.setData({ statusBarHeight, navigationHeight: capsule.height && capsule.top >= statusBarHeight ? (capsule.top - statusBarHeight) * 2 + capsule.height : 44 });
  },
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
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
    const hasProgress = Object.keys(state.completed).length > 0 || Object.keys(state.mistakes).length > 0
      || Object.values(state.activity).some((count) => count > 0)
      || Object.values(state.cursors).some((index) => Number(index) > 0)
      || storage.typingStats().input > 0;
    const first = lists.find((list) => list.id === 'home-phrases');
    const example = bundled[first.id][0];
    const sampleWords = example.words.slice(0, 4).map((word, index) => ({
      index, phonetic: (example.annotations[index] || {}).phonetic || '',
      passed: index === 0, active: index === 1,
      letters: Array.from(word, (letter, position) => ({ position, value: index === 0 || (index === 1 && position < 2) ? letter : '' })),
    }));
    const listItems = libraryItems(state);
    const itemsById = new Map(listItems.map((list) => [list.id, list]));
    const rows = cached(current.id);
    const cursor = Math.max(0, Math.min(state.cursors[current.id] || 0, current.wordCount - 1));
    const savedPreview = state.lastPreview;
    const lastSentence = rows && rows[cursor] ? rows[cursor].zh : savedPreview && savedPreview.listId === current.id && savedPreview.index === cursor ? savedPreview.zh : '继续上次练习';
    this.setData({
      hasProgress, sampleWords, firstSentence: example.zh, firstLabel: first.label, firstTotal: first.wordCount,
      lastLabel: current.label, lastSentence,
      lastCompleted: Math.min(counts[current.id] || 0, current.wordCount), lastTotal: current.wordCount,
      recentLists: recentIds(state).map((id) => itemsById.get(id)).filter(Boolean),
      recommendedLists: lists.filter((list) => list.id === 'home-phrases' || list.id === 'sentences').map((list) => Object.assign({}, list, { completed: Math.min(counts[list.id] || 0, list.wordCount), percent: Math.min(100, Math.round((counts[list.id] || 0) / list.wordCount * 100)) })),
      lists: lists.map((list) => Object.assign({}, list, {
        completed: Math.min(counts[list.id] || 0, list.wordCount),
        percent: Math.min(100, Math.round((counts[list.id] || 0) / list.wordCount * 100)),
      })),
    });
  },
  showAll() { wx.navigateTo({ url: '/pages/library/index' }); },
  startFirst() { wx.navigateTo({ url: '/pages/practice/index?list=home-phrases' }); },
  open(event) { wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent(event.currentTarget.dataset.id)}` }); },
  resume() { wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent((lists.find((list) => list.id === storage.read().lastList) || lists[0]).id)}` }); },
});
