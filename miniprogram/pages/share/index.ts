// 分享海报页面：根据本地学习进度生成海报，并支持分享或保存到系统相册。
import { navigationMetrics } from '../../utils/navigation';
import { posterData, posterThemes, renderPoster } from '../../utils/poster';
import * as storage from '../../utils/storage';
Page({
  data: {
    statusBarHeight: 24,
    navigationHeight: 44,
    canvasWidth: 292,
    canvasHeight: 519,
    generating: true,
    saving: false,
    imagePath: '',
    error: '',
    themes: posterThemes,
    themeId: 'blue',
    sideWidth: 218,
    sideHeight: 388,
    stageHeight: 490,
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const canvasWidth = Math.max(
      1,
      Math.min(273, (info.windowWidth || 390) * 0.7)
    );
    this.setData(
      Object.assign({}, navigationMetrics(), {
        canvasWidth,
        canvasHeight: Math.round((canvasWidth * 693) / 390),
        sideWidth: canvasWidth * 0.8,
        sideHeight: Math.round((canvasWidth * 0.8 * 693) / 390),
        stageHeight: Math.round((canvasWidth * 693) / 390) + 5,
      })
    );
  },
  onShow() {
    if (this.ready) this.generate();
  },
  onReady() {
    this.ready = true;
    this.generate();
  },
  onUnload() {
    this.unloaded = true;
  },
  generate() {
    if (this.data.generating && this.started) return;
    this.started = true;
    this.setData({ generating: true, error: '', imagePath: '' });
    const failed = () => {
      if (!this.unloaded) {
        this.started = false;
        this.setData({ generating: false, error: '海报生成失败，请重试' });
      }
    };
    try {
      const ctx = wx.createCanvasContext('share-poster', this);
      const data = posterData(storage.read());
      this.setData({
        shareTitle: `今天完成 ${data.todayCount} 次练习，和我一起学英语`,
      });
      const alternatives = posterThemes.filter(
        (theme) => theme.id !== this.data.themeId
      );
      alternatives.forEach((theme, index) => {
        const side = wx.createCanvasContext(`share-side-${index}`, this);
        renderPoster(side, data, this.data.sideWidth, theme.id);
        side.draw(false, () => {});
      });
      renderPoster(ctx, data, this.data.canvasWidth, this.data.themeId);
      ctx.draw(false, () => {
        if (this.unloaded) return;
        wx.canvasToTempFilePath(
          {
            canvasId: 'share-poster',
            width: this.data.canvasWidth,
            height: this.data.canvasHeight,
            destWidth: 780,
            destHeight: 1386,
            success: ({ tempFilePath }) => {
              if (!this.unloaded) {
                this.started = false;
                this.setData({ imagePath: tempFilePath, generating: false });
              }
            },
            fail: failed,
          },
          this
        );
      });
    } catch (_) {
      failed();
    }
  },
  // 生成期间禁止切换，避免异步导出覆盖新主题图片。
  selectTheme(event) {
    const themeId = event.currentTarget.dataset.id;
    if (
      this.data.generating ||
      this.data.saving ||
      themeId === this.data.themeId
    )
      return;
    if (!posterThemes.some((theme) => theme.id === themeId)) return;
    this.setData({ themeId });
    this.generate();
  },
  back() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: '/pages/stats/index' }),
    });
  },
  save() {
    if (!this.data.imagePath || this.data.saving) return;
    this.setData({ saving: true });
    const showPermissionModal = () => {
      if (this.unloaded) return;
      this.setData({
        saving: false,
        modal: {
          title: '无法保存到相册',
          content: '请在微信设置中允许保存图片到相册，然后重试。',
          confirmText: '打开设置',
          showCancel: true,
        },
      });
    };
    const saveImage = () =>
      wx.saveImageToPhotosAlbum({
        filePath: this.data.imagePath,
        success: () => {
          if (!this.unloaded) {
            this.setData({ saving: false });
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          }
        },
        fail: (error) => {
          if (this.unloaded) return;
          this.setData({ saving: false });
          if (/auth|deny|permission/i.test((error && error.errMsg) || '')) {
            showPermissionModal();
          } else {
            console.warn('保存海报到相册失败:', error && error.errMsg);
            wx.showToast({
              title: '保存失败，请检查相册权限后重试',
              icon: 'none',
            });
          }
        },
      });
    wx.getSetting({
      success: ({ authSetting }) => {
        const permission = authSetting['scope.writePhotosAlbum'];
        if (permission === true) {
          saveImage();
        } else if (permission === false) {
          showPermissionModal();
        } else {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: saveImage,
            fail: showPermissionModal,
          });
        }
      },
      fail: (error) => {
        if (this.unloaded) return;
        this.setData({ saving: false });
        console.warn('读取相册权限失败:', error && error.errMsg);
        wx.showToast({ title: '无法读取相册权限，请重试', icon: 'none' });
      },
    });
  },
  swallowModal() {},
  closeModal() {
    this.setData({ modal: null });
  },
  confirmModal() {
    this.closeModal();
    wx.openSetting();
  },
  onShareAppMessage() {
    return {
      title: this.data.shareTitle || '和我一起练习英语',
      path: '/pages/learn/index',
      imageUrl: this.data.imagePath || undefined,
    };
  },
});
