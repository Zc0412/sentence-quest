/**
 * 经验值页面：展示累计和今日记录、按日期分组的经验值明细及获取规则。
 * 数据来自当前设备保存的学习记录。
 */
import * as storage from '../../utils/storage';
import { lists } from '../../utils/catalog';
import { navigationMetrics } from '../../utils/navigation';
Page({
  data: { scrolled: false, statusBarHeight: 24, navigationHeight: 44, tab: 'detail', xp: 0, todayXp: 0, groups: [] },
  /** 初始化导航栏高度，避让微信状态栏和胶囊按钮。 */
  onLoad() { this.setData(navigationMetrics()); },
  /** 滚动后显示顶部导航栏背景。 */
  onPageScroll(event) { const scrolled = event.scrollTop > 0; if (scrolled !== this.data.scrolled) this.setData({ scrolled }); },
  /** 读取本机经验值记录，按日期整理明细并计算各组总额。 */
  onShow() {
    const state = storage.read();
    const today = storage.dateKey();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = storage.dateKey(yesterday);
    const groups = [];
    const history = Array.isArray(state.xpHistory) ? state.xpHistory : [];
    // 将有效获奖记录归入对应日期，并生成页面需要的明细行。
    history.forEach((entry, index) => {
      if (!entry || !entry.date || !Number.isFinite(entry.amount) || entry.amount <= 0) return;
      let group = groups.find((item) => item.date === entry.date);
      if (!group) { group = { date: entry.date, title: entry.date === today ? '今天' : entry.date === yesterdayKey ? '昨天' : entry.date, total: 0, items: [] }; groups.push(group); }
      group.total += entry.amount;
      const list = lists.find((item) => item.id === entry.listId);
      const label = list ? list.label : '练习';
      // 首次完美完成的奖励包含 5 XP 加成，展示时拆成两条明细。
      const mainAmount = entry.perfect ? entry.amount - 5 : entry.amount;
      if (mainAmount > 0) group.items.push({ key: `${index}-base`, icon: '/assets/xp-check.svg', color: 'green', title: entry.review ? '复习错题' : list && list.kind === 'word' ? '完成一词' : '完成一句', description: `${label} · ${entry.time}`, amount: mainAmount });
      if (entry.perfect && entry.amount >= 5) group.items.push({ key: `${index}-bonus`, icon: '/assets/xp-star.svg', color: 'gold', title: '无提示奖励', description: '完全正确 · 未使用提示', amount: 5 });
    });
    this.setData({ xp: state.xp, todayXp: (state.xpDaily && state.xpDaily[today]) || 0, groups });
  },
  /** 在经验值明细和获取规则之间切换。 */
  switchTab(event) { const tab = event.currentTarget.dataset.tab; if (tab === 'detail' || tab === 'rules') this.setData({ tab }); },
  /** 返回上一页；没有可返回页面时进入“我的”。 */
  back() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/profile/index' }) }); },
});
