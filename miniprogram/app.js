const { cloudEnvId } = require('./config');
const keySound = require('./utils/keySound');

App({
  onLaunch() {
    keySound.init();
    if (!cloudEnvId) return;
    if (!wx.cloud || typeof wx.cloud.init !== 'function') {
      console.warn('当前微信版本不支持云开发');
      return;
    }
    wx.cloud.init({ env: cloudEnvId });
  },
  onHide() { keySound.stop(); },
});
