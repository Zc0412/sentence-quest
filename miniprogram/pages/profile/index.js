const storage = require('../../utils/storage');
const { lists } = require('../../utils/catalog');
const { navigationMetrics } = require('../../utils/navigation');
const { accuracy } = require('../../utils/typing-stats');
const { preferences, speeds, speedLabels, goals, streak } = require('../../utils/preferences');
Page({
  data: { statusBarHeight: 24, navigationHeight: 44, xp: 0, completed: 0, streak: 0, accuracy: '—', accent: '1', hints: true, speedLabel: '正常', dailyGoal: 10, autoSpeak: true, nickname: '', version: '2.2.0', goalProgress: 0 },
  onLoad() {
    this.setData(navigationMetrics());
    const version = wx.getAccountInfoSync && wx.getAccountInfoSync().miniProgram.version;
    if (version) this.setData({ version });
  },
  onShow() {
    wx.hideTabBar({ animation: false });
    const state = storage.read(); const settings = preferences();
    const completed = lists.reduce((sum, list) => sum + Math.min(list.wordCount, Object.keys(state.completed).filter((key) => key.startsWith(`${list.id}::`)).length), 0);
    this.setData(Object.assign({}, settings, { xp: state.xp, completed, streak: streak(state.activity), accuracy: accuracy(storage.typingStats()), speedLabel: speedLabels[speeds.indexOf(settings.speed)], goalProgress: state.activity[storage.dateKey()] || 0 }));
  },
  onHide() { wx.showTabBar({ animation: false }); },
  nickname(event) { const nickname = event.detail.value.trim().slice(0, 24); storage.settings({ nickname }); this.setData({ nickname }); },
  accent(event) { const accent = event.currentTarget.dataset.value; storage.settings({ accent }); this.setData({ accent }); },
  speed() { wx.showActionSheet({ itemList: speeds.map((value, index) => `${speedLabels[index]}（${value}×）`), success: ({ tapIndex }) => { if (speeds[tapIndex] === undefined) return; storage.settings({ speed: speeds[tapIndex] }); this.setData({ speedLabel: speedLabels[tapIndex] }); } }); },
  goal() { wx.showActionSheet({ itemList: goals.map((value) => `每天 ${value} 句`), success: ({ tapIndex }) => { if (goals[tapIndex] === undefined) return; storage.settings({ dailyGoal: goals[tapIndex] }); this.setData({ dailyGoal: goals[tapIndex] }); } }); },
  toggle(event) { const key = event.currentTarget.dataset.setting; if (!['autoSpeak', 'hints'].includes(key)) return; const value = !this.data[key]; storage.settings({ [key]: value }); this.setData({ [key]: value }); },
  reminder() { wx.showModal({ title: '学习提醒暂未开通', content: '当前版本尚未接入微信订阅消息，无法在离开小程序后发送提醒。你可以先设置每日目标，回来练习时查看今日进度。', showCancel: false, confirmText: '知道了' }); },
  instructions() { wx.showModal({ title: '玩法说明', content: '看中文，用下方键盘逐词拼写英文。拼对自动切词；听发音、提示字母可以帮助练习。拼错、提示或跳过会进入错题本，独立完成复习后即可移除。进度保存在当前设备。', showCancel: false, confirmText: '知道了' }); },
  about() { wx.showModal({ title: '关于句跃 SentLeap', content: `版本 ${this.data.version}\n通过逐词拼写，积累日常英文表达。\n当前提供精选短语与句子闯关两个离线词库，发音需要联网。学习记录保存在本机，暂不支持登录和云同步。`, showCancel: false, confirmText: '知道了' }); },
  tab(event) { const page = event.currentTarget.dataset.page; if (['learn', 'stats', 'review'].includes(page)) wx.switchTab({ url: `/pages/${page}/index` }); },
});
