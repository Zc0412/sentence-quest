const storage = require('../../utils/storage');
const { navigationMetrics } = require('../../utils/navigation');
const { libraryItems, recentIds } = require('../../utils/library-list');
Page({
  data: { statusBarHeight: 24, navigationHeight: 44, kind: 'phrase', filter: 'all', query: '', lists: [], filters: [], phraseCount: 0, wordCount: 0, filterLabel: '全部' },
  onLoad() { this.setData(navigationMetrics()); },
  onShow() { this.refresh(); },
  refresh() {
    const state = storage.read(); const all = libraryItems(state); const recent = recentIds(state);
    const selected = all.filter((item) => item.kind === this.data.kind);
    const categories = [...new Set(selected.map((item) => item.category))];
    const filters = [{ id: 'all', label: '全部' }, { id: 'recent', label: '最近练习' }, { id: 'progress', label: '进行中' }]
      .concat(categories.map((category) => ({ id: category, label: category, category: true })));
    const filter = filters.some((item) => item.id === this.data.filter) ? this.data.filter : 'all';
    const query = this.data.query.trim().toLowerCase();
    const filtered = selected.filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'recent' ? recent.includes(item.id) : filter === 'progress' ? item.inProgress : item.category === filter);
      return matchesFilter && `${item.label} ${item.category}`.toLowerCase().includes(query);
    });
    if (filter === 'recent') filtered.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
    this.setData({ filters, filter, filterLabel: filters.find((item) => item.id === filter).label, lists: filtered,
      phraseCount: all.filter((item) => item.kind === 'phrase').length, wordCount: all.filter((item) => item.kind === 'word').length });
  },
  chooseKind(event) { const kind = event.currentTarget.dataset.kind; if (!['phrase', 'word'].includes(kind)) return; this.setData({ kind, filter: 'all' }); this.refresh(); },
  chooseFilter(event) { this.setData({ filter: event.currentTarget.dataset.filter }); this.refresh(); },
  search(event) { this.setData({ query: event.detail.value }); this.refresh(); },
  clearSearch() { this.setData({ query: '' }); this.refresh(); },
  open(event) { const id = event.currentTarget.dataset.id; if (this.data.lists.some((list) => list.id === id)) wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent(id)}` }); },
  back() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/learn/index' }) }); },
});
