const storage = require('../../utils/storage');
const { navigationMetrics } = require('../../utils/navigation');
const { posterData, renderPoster } = require('../../utils/poster');
Page({
  data: { statusBarHeight: 24, navigationHeight: 44, canvasWidth: 292, canvasHeight: 519, generating: true, saving: false, imagePath: '', error: '' },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const canvasWidth = Math.max(1, Math.min(292, (info.windowWidth || 390) - 32));
    this.setData(Object.assign({}, navigationMetrics(), { canvasWidth, canvasHeight: Math.round(canvasWidth * 693 / 390) }));
  },
  onShow() { if (this.ready) this.generate(); },
  onReady() { this.ready = true; this.generate(); },
  onUnload() { this.unloaded = true; },
  generate() {
    if (this.data.generating && this.started) return;
    this.started = true;
    this.setData({ generating: true, error: '', imagePath: '' });
    const failed = () => { if (!this.unloaded) { this.started = false; this.setData({ generating: false, error: '海报生成失败，请重试' }); } };
    try {
      const ctx = wx.createCanvasContext('share-poster', this);
      const data = posterData(storage.read());
      this.setData({ shareTitle: `今天完成 ${data.todayCount} 次练习，和我一起学英语` });
      renderPoster(ctx, data, this.data.canvasWidth);
      ctx.draw(false, () => {
        if (this.unloaded) return;
        wx.canvasToTempFilePath({ canvasId: 'share-poster', width: this.data.canvasWidth, height: this.data.canvasHeight, destWidth: 780, destHeight: 1386,
          success: ({ tempFilePath }) => { if (!this.unloaded) { this.started = false; this.setData({ imagePath: tempFilePath, generating: false }); } }, fail: failed }, this);
      });
    } catch (_) { failed(); }
  },
  back() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/stats/index' }) }); },
  save() {
    if (!this.data.imagePath || this.data.saving) return;
    this.setData({ saving: true });
    wx.saveImageToPhotosAlbum({ filePath: this.data.imagePath,
      success: () => { if (!this.unloaded) { this.setData({ saving: false }); wx.showToast({ title: '已保存到相册', icon: 'success' }); } },
      fail: (error) => {
        if (this.unloaded) return;
        this.setData({ saving: false });
        if (/auth|deny|permission/i.test((error && error.errMsg) || '')) {
          wx.showModal({ title: '无法保存到相册', content: '请在微信设置中允许保存图片到相册，然后重试。', confirmText: '打开设置', success: ({ confirm }) => { if (confirm) wx.openSetting(); } });
        } else wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      },
    });
  },
  onShareAppMessage() { return { title: this.data.shareTitle || '和我一起练习英语', path: '/pages/learn/index', imageUrl: this.data.imagePath || undefined }; },
});
