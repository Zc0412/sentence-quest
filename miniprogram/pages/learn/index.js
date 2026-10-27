const { lists } = require('../../utils/catalog');
const storage = require('../../utils/storage');
Page({
  data: { query: '', filter: 'all', lists: [], lastLabel: '', today: 0 },
  onShow() {
    const state = storage.read();
    this.setData({ lastLabel: (lists.find((list) => list.id === state.lastList) || lists[0]).label, today: state.activity[storage.dateKey()] || 0 });
    this.refresh();
  },
  refresh() {
    const state = storage.read();
    const counts = {};
    Object.keys(state.completed).forEach((key) => { const id = key.split('::')[0]; counts[id] = (counts[id] || 0) + 1; });
    const query = this.data.query.trim().toLowerCase();
    this.setData({ lists: lists.filter((list) => (this.data.filter === 'all' || list.kind === this.data.filter) && `${list.label} ${list.category}`.toLowerCase().includes(query)).map((list) => Object.assign({}, list, { completed: counts[list.id] || 0 })) });
  },
  search(event) { this.setData({ query: event.detail.value }); this.refresh(); },
  filter(event) { this.setData({ filter: event.currentTarget.dataset.kind }); this.refresh(); },
  open(event) { wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent(event.currentTarget.dataset.id)}` }); },
  resume() { wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent(storage.read().lastList)}` }); },
});
