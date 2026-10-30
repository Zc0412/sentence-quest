const config = require('../config');
let serial = 0;
function createAudioStore() {
  const cache = new Map(); const paths = new Set();
  let disposed = false;
  const fs = wx.getFileSystemManager && wx.getFileSystemManager();
  const remove = (path) => { if (fs && path) fs.unlink({ filePath: path, fail() {} }); paths.delete(path); };
  function load(word, accent) {
    if (disposed || !word || !config.cloudEnvId || !wx.cloud || typeof wx.cloud.callFunction !== 'function' || !fs || !wx.env || !wx.env.USER_DATA_PATH) return Promise.reject(new Error('请先配置云开发环境'));
    const key = `${accent}:${word}`;
    if (cache.has(key)) return cache.get(key);
    const request = new Promise((resolve, reject) => {
      wx.cloud.callFunction({ name: 'pronunciation', data: { word, type: accent }, success(response) {
        const result = response.result;
        if (!result || !result.ok || typeof result.audio !== 'string' || !result.audio) { console.warn('发音云函数返回错误:', result && result.error || '返回数据无效'); reject(new Error('发音服务暂不可用')); return; }
        const path = `${wx.env.USER_DATA_PATH}/sentleap-audio-${Date.now()}-${++serial}.mp3`;
        fs.writeFile({ filePath: path, data: result.audio, encoding: 'base64', success() { if (disposed || cache.get(key) !== request) { remove(path); reject(new Error('音频已取消')); return; } paths.add(path); resolve(path); }, fail(error) { console.warn('发音文件写入失败:', error && error.errMsg); reject(new Error('音频保存失败')); } });
      }, fail(error) { console.warn('发音云函数调用失败:', error && error.errCode, error && error.errMsg); reject(new Error('云函数调用失败')); } });
    });
    cache.set(key, request);
    request.catch(() => { if (cache.get(key) === request) cache.delete(key); });
    while (cache.size > 8) { const oldest = cache.keys().next().value; const pending = cache.get(oldest); cache.delete(oldest); pending.then(remove, () => {}); }
    return request;
  }
  function dispose() { disposed = true; cache.clear(); paths.forEach(remove); }
  return { load, dispose };
}
module.exports = { createAudioStore };
