const { cloudEnvId } = require('./config');

App({
  onLaunch() {
    if (!cloudEnvId) return;
    if (!wx.cloud || typeof wx.cloud.init !== 'function') {
      console.warn('当前微信版本不支持云开发');
      return;
    }
    wx.cloud.init({ env: cloudEnvId });
  },
});
