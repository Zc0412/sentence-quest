function navigationMetrics() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  const capsule = wx.getMenuButtonBoundingClientRect();
  const statusBarHeight = info.statusBarHeight || 24;
  return { statusBarHeight, navigationHeight: capsule.height && capsule.top >= statusBarHeight ? (capsule.top - statusBarHeight) * 2 + capsule.height : 44 };
}
module.exports = { navigationMetrics };
