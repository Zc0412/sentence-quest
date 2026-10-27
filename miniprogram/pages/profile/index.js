const storage = require('../../utils/storage');
Page({
  data: { xp: 0, completed: 0, days: 0, accent: '1', hints: true, activity: [] },
  onShow() {
    const state = storage.read();
    const activity = Array.from({ length: 28 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - 27 + index);
      const key = storage.dateKey(date); return { key, day: date.getDate(), count: state.activity[key] || 0 };
    });
    this.setData({ xp: state.xp, completed: Object.keys(state.completed).length, days: Object.keys(state.activity).length, accent: state.settings.accent, hints: state.settings.hints, activity });
  },
  accent(event) { const accent = event.currentTarget.dataset.value; storage.settings({ accent }); this.setData({ accent }); },
  hints(event) { storage.settings({ hints: event.detail.value }); this.setData({ hints: event.detail.value }); },
});
