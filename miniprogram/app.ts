import config from './config';
import keySound from './utils/keySound';

App({
  onLaunch() {
    keySound.init();
    if (!config.cloudEnvId) return;
    if (!wx.cloud || typeof wx.cloud.init !== 'function') {
      console.warn('当前微信版本不支持云开发');
      return;
    }
    wx.cloud.init({ env: config.cloudEnvId });
  },
  onHide() { keySound.stop(); },
});
