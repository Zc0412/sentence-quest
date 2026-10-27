const catalog = require('../../utils/catalog');
const storage = require('../../utils/storage');
const session = require('../../utils/session');
const { apiBaseUrl } = require('../../config');
Page({
  data: { loading: true, loadError: '', done: false, finished: false, keyboardHeight: 0, typed: '', focus: false, slots: [], hints: true, earned: 0 },
  onLoad(options) { this.options = options; this.review = options.review === '1'; this.load(); },
  async load() {
    this.setData({ loading: true, loadError: '' });
    try {
      if (this.review) {
        this.entries = Object.values(storage.read().mistakes);
        this.index = 0;
      } else {
        const id = this.options.list || 'home-phrases';
        this.entries = (await catalog.load(id)).map((item) => ({ listId: id, item }));
        this.index = Math.max(0, Math.min(storage.read().cursors[id] || 0, this.entries.length - 1));
      }
      if (this.unloaded) return;
      const list = catalog.lists.find((item) => item.id === (this.options.list || 'home-phrases'));
      wx.setNavigationBarTitle({ title: this.review ? '错题复习' : list.label });
      this.setData({ loading: false, hints: storage.read().settings.hints }); this.begin();
    } catch (error) { if (!this.unloaded) this.setData({ loading: false, loadError: error.message }); }
  },
  begin() {
    if (this.index >= this.entries.length) {
      this.setData({ finished: true, focus: false, keyboardHeight: 0 }); wx.hideKeyboard(); return;
    }
    this.entry = this.entries[this.index]; this.state = session.start(this.entry.item);
    if (!this.review) storage.cursor(this.entry.listId, this.index);
    this.setData({ item: this.entry.item, number: this.index + 1, total: this.entries.length, progress: Math.round(this.index / this.entries.length * 100), earned: 0, finished: false });
    this.render();
  },
  render() {
    const state = this.state; const word = state.item.words[state.wordIndex] || '';
    const annotation = (state.item.annotations || [])[state.wordIndex] || {};
    const phonetic = storage.read().settings.accent === '2' ? annotation.usphone || annotation.phonetic : annotation.phonetic;
    this.setData({ done: state.done, typed: state.typed, error: state.error, wordNumber: state.wordIndex + 1, wordTotal: state.item.words.length, phonetic: phonetic || '',
      hintText: state.revealed ? word.slice(0, state.revealed) + '＿'.repeat(Math.max(0, word.length - state.revealed)) : '',
      slots: state.item.words.map((text, index) => ({ index, active: index === state.wordIndex, passed: index < state.wordIndex, text: index < state.wordIndex ? text : index === state.wordIndex ? '正在拼写' : '•••' })),
    });
  },
  input(event) {
    if (!this.state || this.state.done) return '';
    const wasDirty = this.state.dirty;
    this.state = session.input(this.state, event.detail.value);
    if (!wasDirty && this.state.dirty) storage.mistake(this.entry.listId, this.entry.item);
    if (this.state.done) {
      const earned = storage.complete(this.entry.listId, this.entry.item, !this.state.dirty, this.review);
      if (!this.review) storage.cursor(this.entry.listId, Math.min(this.index + 1, this.entries.length - 1));
      this.setData({ earned, focus: false, keyboardHeight: 0 }); wx.hideKeyboard();
    }
    this.render(); return this.state.typed;
  },
  hint() {
    if (!this.state || this.state.done || !this.data.hints) return;
    this.state = session.hint(this.state); storage.mistake(this.entry.listId, this.entry.item); this.render();
  },
  skip() {
    if (!this.state || this.state.done) return;
    storage.mistake(this.entry.listId, this.entry.item); this.next();
  },
  next() { if (this.audio) this.audio.stop(); this.index += 1; this.begin(); },
  replay() { this.index = 0; this.begin(); },
  home() { wx.switchTab({ url: '/pages/learn/index' }); },
  keyboard(event) { this.setData({ keyboardHeight: this.state && !this.state.done ? Math.max(0, event.detail.height || 0) : 0 }); },
  focus() { this.setData({ focus: true }); },
  blur() { this.setData({ focus: false, keyboardHeight: 0 }); },
  speak() {
    if (!this.state) return;
    if (!/^https:\/\//.test(apiBaseUrl)) { wx.showToast({ title: '发音需先配置 Web 服务域名', icon: 'none' }); return; }
    const word = this.state.done ? this.state.item.english : this.state.item.words[this.state.wordIndex];
    if (!this.audio) {
      this.audio = wx.createInnerAudioContext();
      this.audio.onError(() => wx.showToast({ title: '播放失败，请检查网络与域名配置', icon: 'none' }));
    }
    this.audio.stop();
    this.audio.src = `${apiBaseUrl.replace(/\/$/, '')}/api/pronunciation?word=${encodeURIComponent(word)}&type=${storage.read().settings.accent}`;
    this.audio.play();
  },
  onHide() { if (this.audio) this.audio.stop(); },
  onUnload() { this.unloaded = true; if (this.audio) this.audio.destroy(); },
});
