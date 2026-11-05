import config from '../config';
let serial = 0;
/** 管理云托管发音请求及页面内的本地音频缓存。 */
function createAudioStore() {
  const cache = new Map(); const paths = new Set();
  let disposed = false;
  const fs = wx.getFileSystemManager && wx.getFileSystemManager();
  const remove = (path) => { if (fs && path) fs.unlink({ filePath: path, fail() {} }); paths.delete(path); };
  // 请求或复用指定单词和口音的音频。
  function load(word, accent) {
    if (disposed || !word || !config.cloudEnvId || !wx.cloud || typeof wx.cloud.callContainer !== 'function' || !config.cloudServiceName || !fs || !wx.env || !wx.env.USER_DATA_PATH) return Promise.reject(new Error('请先配置云开发环境'));
    const key = `${accent}:${word}`;
    if (cache.has(key)) return cache.get(key);
    const request = new Promise((resolve, reject) => {
      wx.cloud.callContainer({ config: { env: config.cloudEnvId }, path: '/api/pronunciation', method: 'POST', header: { 'X-WX-SERVICE': config.cloudServiceName }, data: { word, type: accent }, success(response) {
        const result = response.data as { ok?: boolean; audio?: string; error?: string } | undefined;
        if (!result || !result.ok || typeof result.audio !== 'string' || !result.audio) { console.warn('发音服务返回错误:', result && result.error || '返回数据无效'); reject(new Error('发音服务暂不可用')); return; }
        const path = `${wx.env.USER_DATA_PATH}/sentleap-audio-${Date.now()}-${++serial}.mp3`;
        fs.writeFile({ filePath: path, data: result.audio, encoding: 'base64', success() { if (disposed || cache.get(key) !== request) { remove(path); reject(new Error('音频已取消')); return; } paths.add(path); resolve(path); }, fail(error) { console.warn('发音文件写入失败:', error && error.errMsg); reject(new Error('音频保存失败')); } });
      }, fail(error) { console.warn('发音服务调用失败:', error && (error as any).errCode, error && error.errMsg); reject(new Error('云托管调用失败')); } });
    });
    cache.set(key, request);
    request.catch(() => { if (cache.get(key) === request) cache.delete(key); });
    while (cache.size > 8) { const oldest = cache.keys().next().value; const pending = cache.get(oldest); cache.delete(oldest); pending.then(remove, () => {}); }
    return request;
  }
  // 结束页面时删除已写入的临时音频。
  function dispose() { disposed = true; cache.clear(); paths.forEach(remove); }
  return { load, dispose };
}
export { createAudioStore };
