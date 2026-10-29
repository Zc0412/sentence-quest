const catalog = require('../../utils/catalog');
const storage = require('../../utils/storage');
const session = require('../../utils/session');
const { navigationMetrics } = require('../../utils/navigation');
const { inputDelta, accuracy } = require('../../utils/typing-stats');
const { normalizeWord } = require('../../utils/validator');
const { preferences } = require('../../utils/preferences');
const { apiBaseUrl } = require('../../config');
Page({
  data: { loading: true, loadError: '', done: false, finished: false, typed: '', slots: [], hints: true, earned: 0, xp: 0, grammarIndex: 0, statusBarHeight: 24, navigationHeight: 44, accent: '1', shift: false, pressedKey: '', keyRows: ['qwertyuiop'.split(''), 'asdfghjkl'.split(''), 'zxcvbnm'.split('')], inputCount: 0, correctCount: 0, accuracy: '—' },
  onLoad(options) { this.setData(navigationMetrics()); this.options = options; this.review = options.review === '1'; this.load(); },
  async load() {
    this.typing = this.typing || { input: 0, correct: 0 };
    this.setData({ loading: true, loadError: '' });
    try {
      if (this.review) {
        this.entries = Object.values(storage.read().mistakes).filter((entry) => catalog.lists.some((list) => list.id === entry.listId));
        this.index = 0;
      } else {
        const id = this.options.list || 'home-phrases';
        this.entries = (await catalog.load(id)).map((item) => ({ listId: id, item }));
        this.index = Math.max(0, Math.min(storage.read().cursors[id] || 0, this.entries.length - 1));
      }
      if (this.unloaded) return;
      this.mastered = this.entries.filter((entry) => storage.read().completed[storage.key(entry.listId, entry.item)]).length;
      const list = catalog.lists.find((item) => item.id === (this.options.list || 'home-phrases'));
      wx.setNavigationBarTitle({ title: this.review ? '错题复习' : list.label });
      this.setData({ loading: false, xp: storage.read().xp, accent: storage.read().settings.accent, reviewMode: this.review, listLabel: this.review ? '巩固练习' : list.label, hints: storage.read().settings.hints }); this.begin();
    } catch (error) { if (!this.unloaded) this.setData({ loading: false, loadError: error.message }); }
  },
  begin() {
    if (this.index >= this.entries.length) {
      this.setData({ finished: true }); wx.hideKeyboard(); return;
    }
    this.entry = this.entries[this.index]; this.state = session.start(this.entry.item);
    if (!this.review) storage.cursor(this.entry.listId, this.index, this.entry.item);
    const entryList = catalog.lists.find((list) => list.id === this.entry.listId);
    this.setData({ isPhrase: this.entry.listId === 'home-phrases', isWord: entryList?.kind === 'word', hideCompletionBadge: entryList?.category === '短语练习', grammarIndex: 0, grammarExplanation: (this.entry.item.grammar || [])[0]?.explanation || '', item: this.entry.item, number: this.index + 1, total: this.entries.length, progress: Math.round(this.index / this.entries.length * 100), earned: 0, finished: false });
    this.render();
  },
  render() {
    const state = this.state;
    const characterCount = state.item.words.join('').length;
    const completionSize = state.item.words.length > 7 || characterCount > 40 ? 'dense' : state.item.words.length > 4 || characterCount > 22 ? 'compact' : 'regular';
    const annotation = (state.item.annotations || [])[state.wordIndex] || {};
    const mastered = this.mastered;
    const currentWord = state.item.words[state.wordIndex] || '';
    const extraKeys = [...new Set(Array.from(normalizeWord(currentWord)).filter((character) => !/[a-z\s']/i.test(character)))];
    const phonetic = storage.read().settings.accent === '2' ? annotation.usphone || annotation.phonetic : annotation.phonetic;
    this.setData({ extraKeys, mastered, masteryPercent: Math.round(mastered / this.entries.length * 100), previousLabel: this.index > 0 ? this.entries[this.index - 1].item.zh : '', inputCount: this.typing.input, correctCount: this.typing.correct, accuracy: accuracy(this.typing), progress: Math.round((this.index + (state.done ? 1 : 0)) / this.entries.length * 100), xp: storage.read().xp, done: state.done, typed: state.typed, error: state.error, wordNumber: state.wordIndex + 1, wordTotal: state.item.words.length, phonetic: phonetic || '',
      completionClean: !state.dirty,
      completionSize,
      completedWords: state.done ? state.item.words.map((text, index) => {
        const details = (state.item.annotations || [])[index] || {};
        const group = (state.item.grammar || []).find((part) => index >= part.start && index < part.end);
        return { index, text,
          phonetic: storage.read().settings.accent === '2' ? details.usphone || details.phonetic || '' : details.phonetic || '',
          meaning: details.meaning || '', pos: details.pos || '', color: details.color || '#3b82f6',
          role: group?.role || '', roleColor: group?.color || '#2f6fed' };
      }) : [],
      slots: state.item.words.map((text, index) => {
        const details = (state.item.annotations || [])[index] || {};
        const active = !state.done && index === state.wordIndex;
        const passed = state.done || index < state.wordIndex;
        const shown = active ? state.typed + text.slice(state.typed.length, Math.max(state.typed.length, state.revealed)) : '';
        return { index, active, passed, letters: Array.from({ length: Math.max(text.length, shown.length) }, (_, position) => ({ position, value: passed ? text[position] : shown[position] || '', current: active && position === state.typed.length, hinted: active && position >= state.typed.length && position < state.revealed, wrong: active && !!shown[position] && shown[position].toLowerCase() !== (text[position] || '').toLowerCase() })), incorrect: active && !!state.error,
          text: passed ? text : shown + '_'.repeat(Math.max(0, text.length - shown.length)),
          phonetic: storage.read().settings.accent === '2' ? details.usphone || details.phonetic || '' : details.phonetic || '',
          meaning: details.meaning || '', pos: details.pos || '', color: this.entry.listId === 'home-phrases' ? '#3b82f6' : details.color || '#3b82f6' };
      }),
    });
  },
  input(event) {
    if (!this.state || this.state.done) return '';
    const delta = inputDelta(this.state.typed, event.detail.value, this.state.item.words[this.state.wordIndex]);
    this.typing = this.typing || { input: 0, correct: 0 };
    this.typing.input += delta.input; this.typing.correct += delta.correct; storage.recordTyping(delta, this.entry.listId);
    const previousWordIndex = this.state.wordIndex;
    const wasDirty = this.state.dirty;
    this.state = session.input(this.state, event.detail.value);
    if (!wasDirty && this.state.dirty) storage.mistake(this.entry.listId, this.entry.item, 'error');
    if (this.state.done) {
      const wasCompleted = !!storage.read().completed[storage.key(this.entry.listId, this.entry.item)];
      const earned = storage.complete(this.entry.listId, this.entry.item, !this.state.dirty, this.review);
      if (!wasCompleted) this.mastered += 1;
      if (!this.review) { const nextIndex = Math.min(this.index + 1, this.entries.length - 1); storage.cursor(this.entry.listId, nextIndex, this.entries[nextIndex].item); }
      this.setData({ earned, pressedKey: '', grammarIndex: -1, grammarExplanation: this.entry.item.note || (this.entry.item.grammar || []).map((group) => group.explanation).filter(Boolean).join(' ') }); wx.hideKeyboard();
    }
    this.render();
    if (!this.state.done && this.state.wordIndex !== previousWordIndex && preferences().autoSpeak) this.speak(true);
    return this.state.typed;
  },
  hint() {
    if (!this.state || this.state.done || !this.data.hints) return;
    this.state = session.hint(this.state); storage.mistake(this.entry.listId, this.entry.item, 'hint'); this.render();
  },
  skip() {
    if (!this.state || this.state.done) return;
    storage.mistake(this.entry.listId, this.entry.item, 'skip'); this.next();
  },
  pressKey(event) { this.setData({ pressedKey: event.currentTarget.dataset.key }); },
  releaseKey() { this.setData({ pressedKey: '' }); },
  key(event) {
    if (!this.state || this.state.done) return;
    const key = event.currentTarget.dataset.key;
    if (key === 'shift') { this.setData({ shift: !this.data.shift }); return; }
    const value = key === 'delete' ? this.state.typed.slice(0, -1) : this.state.typed + (this.data.shift ? key.toUpperCase() : key);
    this.input({ detail: { value } });
  },
  accent(event) { const accent = event.currentTarget.dataset.value; storage.settings({ accent }); this.setData({ accent }); if (this.state) this.render(); },
  previous() { if (this.index > 0) { if (this.audio) this.audio.stop(); this.index -= 1; this.begin(); } },
  advance() { if (this.state && this.state.done) this.next(); else this.skip(); },
  next() { if (this.audio) this.audio.stop(); this.index += 1; this.begin(); },
  replay() { this.index = 0; this.begin(); },
  retryCurrent() { if (!this.state || !this.state.done) return; if (this.audio) this.audio.stop(); this.releaseKey(); this.begin(); },
  selectGrammar(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index === -1) {
      this.setData({ grammarIndex: -1, grammarExplanation: this.entry.item.note || (this.entry.item.grammar || []).map((group) => group.explanation).filter(Boolean).join(' ') });
      return;
    }
    const group = (this.entry.item.grammar || [])[index];
    if (group) this.setData({ grammarIndex: index, grammarExplanation: group.explanation });
  },
  instructions() { wx.showModal({ title: '玩法说明', content: '看中文，输入当前高亮单词。拼对自动进入下一词；可听发音或使用字母提示。拼错、提示和跳过会进入错题本，独立完成复习即可移除。', showCancel: false, confirmText: '开始练习' }); },
  home() { wx.switchTab({ url: '/pages/learn/index' }); },
  speak(automatic = false) {
    if (!this.state) return;
    if (!/^https:\/\//.test(apiBaseUrl)) { if (automatic !== true) wx.showToast({ title: '发音需先配置 Web 服务域名', icon: 'none' }); return; }
    const word = this.state.done ? this.state.item.english : this.state.item.words[this.state.wordIndex];
    if (!this.audio) {
      this.audio = wx.createInnerAudioContext();
      this.audio.onError(() => wx.showToast({ title: '播放失败，请检查网络与域名配置', icon: 'none' }));
    }
    this.audio.stop();
    this.audio.playbackRate = 1;
    this.audio.src = `${apiBaseUrl.replace(/\/$/, '')}/api/pronunciation?word=${encodeURIComponent(word)}&type=${storage.read().settings.accent}`;
    this.audio.play();
  },
  onHide() { this.releaseKey(); if (this.audio) this.audio.stop(); },
  onUnload() { this.unloaded = true; if (this.audio) this.audio.destroy(); },
});
