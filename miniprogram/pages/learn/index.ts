/** 题库首页：读取本地进度与题库，提供首次练习、继续练习及单次卡片过渡。 */
import { createPracticeTransition } from '../../utils/practice-transition';
import { lists, bundled, cached } from '../../utils/catalog';
import * as storage from '../../utils/storage';
import { libraryItems, recentIds } from '../../utils/library-list';
Page({
  data: { practiceMotion: '', motionExpanded: false, motionBounds: '', scrolled: false, hasProgress: false, sampleWords: [], firstLabel: '精选短语', firstTotal: 0, firstSentence: '', lists: [], lastLabel: '', lastSentence: '', lastCompleted: 0, lastTotal: 0, statusBarHeight: 24, navigationHeight: 44 },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const capsule = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = info.statusBarHeight || 24;
    this.setData({ statusBarHeight, navigationHeight: capsule.height && capsule.top >= statusBarHeight ? (capsule.top - statusBarHeight) * 2 + capsule.height : 44 });
  },
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
  onHide() {
    if (this.practiceTransition) this.practiceTransition.cancel();
  },
  onUnload() {
    if (this.practiceTransition) this.practiceTransition.cancel();
  },
  onShow() {
    if (this.practiceTransition) this.practiceTransition.cancel();
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
      || Object.values(state.activity).some((count) => Number(count) > 0)
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
      lastLabel: current.label, lastSentence, lastIsWord: current.kind === 'word',
      lastCompleted: Math.min(counts[current.id] || 0, current.wordCount), lastTotal: current.wordCount,
      recentLists: recentIds(state).map((id) => itemsById.get(id)).filter(Boolean),
      recommendedLists: lists.filter((list) => list.id === 'home-phrases' || list.id === 'sentences').map((list) => Object.assign({}, list, { completed: Math.min(counts[list.id] || 0, list.wordCount), percent: Math.min(100, Math.round((counts[list.id] || 0) / list.wordCount * 100)) })),
      lists: lists.map((list) => Object.assign({}, list, {
        completed: Math.min(counts[list.id] || 0, list.wordCount),
        percent: Math.min(100, Math.round((counts[list.id] || 0) / list.wordCount * 100)),
      })),
    });
  },
  showAll() {
    if (this.practiceTransition?.isActive()) return;
    wx.navigateTo({ url: '/pages/library/index' });
  },
  startFirst() {
    this.enterPractice('home-phrases', 'start');
  },
  open(event) {
    if (this.practiceTransition?.isActive()) return;
    wx.navigateTo({ url: `/pages/practice/index?list=${encodeURIComponent(event.currentTarget.dataset.id)}` });
  },
  resume() {
    const list = lists.find((item) => item.id === storage.read().lastList) || lists[0];
    this.enterPractice(list.id, 'continue');
  },
  /** 按当前视口测量卡片，兼容滚动位置和不同屏宽。 */
  enterPractice(listId, motion) {
    if (!this.practiceTransition) {
      this.practiceTransition = createPracticeTransition({
        measure: (selector, done) => {
          if (!wx.createSelectorQuery) return done();
          wx.createSelectorQuery().in(this).select(selector).boundingClientRect((bounds) => {
            done(bounds as WechatMiniprogram.BoundingClientRectCallbackResult);
          }).exec();
        },
        render: (values) => this.setData(values),
        navigate: (url, fail) => wx.navigateTo({ url, fail }),
        failed: () => wx.showToast({ title: '暂时无法打开练习，请重试', icon: 'none' }),
      });
    }
    this.practiceTransition.start(listId, motion);
  },
  /** 过渡期间拦截触摸，避免连点或滚动移动卡片。 */
  stopMotionTouch() {},
});
