const storage = require('../../utils/storage');
const catalog = require('../../utils/catalog');
const { navigationMetrics } = require('../../utils/navigation');
const { apiBaseUrl } = require('../../config');
Page({
  data: { statusBarHeight: 24, navigationHeight: 44, scrolled: false, total: 0, items: [], filters: [], selected: '', query: '', loading: false, failed: false },
  onLoad() { this.setData(navigationMetrics()); },
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
  onShow() { this.refresh(); },
  async refresh() {
    const generation = this.generation = (this.generation || 0) + 1;
    const state = storage.read();
    const byId = new Map(catalog.lists.map((list) => [list.id, list]));
    const keys = Object.keys(state.completed).reverse().filter((key) => state.completed[key] && byId.has(key.split('::')[0]));
    const listIds = [...new Set(keys.map((key) => key.split('::')[0]))];
    const snapshots = state.masteredItems && typeof state.masteredItems === 'object' ? state.masteredItems : {};
    const resolved = {};
    keys.forEach((key) => { if (snapshots[key] && typeof snapshots[key].english === 'string' && typeof snapshots[key].zh === 'string') resolved[key] = snapshots[key]; });
    const missingLists = listIds.filter((id) => keys.some((key) => key.startsWith(`${id}::`) && !resolved[key]));
    this.records = []; this.setData({ total: keys.length, filters: listIds.map((id) => ({ id, label: byId.get(id).label })), loading: missingLists.length > 0, failed: false });
    const update = () => {
      if (this.unloaded || generation !== this.generation) return;
      const accent = storage.read().settings.accent;
      this.records = keys.filter((key) => resolved[key]).map((key) => {
        const listId = key.split('::')[0]; const item = resolved[key]; const list = byId.get(listId);
        return { key, listId, english: item.english, zh: item.zh, phonetic: list.kind === 'word' ? (accent === '2' ? item.usphone || item.phonetic : item.phonetic) || '' : '' };
      });
      this.applyFilter();
    };
    update();
    let failed = false; let cursor = 0;
    const worker = async () => {
      while (cursor < missingLists.length) {
        const id = missingLists[cursor++];
        try {
          const rows = await catalog.load(id);
          if (this.unloaded || generation !== this.generation) return;
          rows.forEach((item) => {
            const key = storage.key(id, item);
            if (state.completed[key] && !resolved[key]) { const annotation = (item.annotations || [])[0] || {}; resolved[key] = { english: item.english, zh: item.zh, phonetic: annotation.phonetic || '', usphone: annotation.usphone || '' }; }
          });
          if (keys.some((key) => key.startsWith(`${id}::`) && !resolved[key])) failed = true;
          update();
        } catch (_) { failed = true; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, missingLists.length) }, () => worker()));
    if (!this.unloaded && generation === this.generation) this.setData({ loading: false, failed });
  },
  applyFilter() {
    const query = this.data.query.trim().toLowerCase(); const selected = this.data.selected;
    this.setData({ items: (this.records || []).filter((item) => (!selected || item.listId === selected) && (!query || item.english.toLowerCase().includes(query) || item.zh.toLowerCase().includes(query))) });
  },
  search(event) { this.setData({ query: event.detail.value }); this.applyFilter(); },
  filter(event) { this.setData({ selected: event.currentTarget.dataset.id || '' }); this.applyFilter(); },
  speak(event) {
    const word = event.currentTarget.dataset.word;
    if (!word || !/^https:\/\//.test(apiBaseUrl)) { wx.showToast({ title: '发音需先配置 Web 服务域名', icon: 'none' }); return; }
    if (!this.audio) { this.audio = wx.createInnerAudioContext(); this.audio.onError(() => wx.showToast({ title: '播放失败，请检查网络与域名配置', icon: 'none' })); }
    this.audio.stop(); this.audio.playbackRate = 1;
    this.audio.src = `${apiBaseUrl.replace(/\/$/, '')}/api/pronunciation?word=${encodeURIComponent(word)}&type=${storage.read().settings.accent}`;
    this.audio.play();
  },
  back() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/profile/index' }) }); },
  learn() { wx.switchTab({ url: '/pages/learn/index' }); },
  onHide() { this.generation = (this.generation || 0) + 1; if (this.audio) this.audio.stop(); },
  onUnload() { this.unloaded = true; this.generation = (this.generation || 0) + 1; if (this.audio) this.audio.destroy(); },
});
