const lists = require('../data/catalog');
const config = require('../config');
const bundled = { 'home-phrases': require('../data/home-phrases'), sentences: require('../data/sentences'), 'vocabulary-dev-test': require('../data/vocabulary-dev-test') };
let lastCache;
function phonetic(value) { return typeof value === 'string' && value.trim() ? `/${value.trim().replace(/^\/+|\/+$/g, '')}/` : ''; }
function normalize(list, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length !== list.wordCount) throw new Error('题库数据不完整，请重新加载');
  return rows.map((item, index) => {
    if (list.kind === 'word' && !list.bundled) {
      if (!item || typeof item.name !== 'string' || !item.name.trim() || !Array.isArray(item.trans) || !item.trans.length || !item.trans.every((part) => typeof part === 'string')) throw new Error('词库格式错误');
      const meaning = item.trans.join('；');
      return { id: `${list.id}:${index}`, zh: meaning, english: item.name, words: [item.name], note: '', grammar: [],
        annotations: [{ phonetic: phonetic(item.ukphone || item.usphone), usphone: phonetic(item.usphone), meaning, pos: '', color: '#3b82f6' }] };
    }
    if (!item || typeof item.id !== 'string' || typeof item.zh !== 'string' || typeof item.english !== 'string' || !Array.isArray(item.words) || !item.words.length || !item.words.every((word) => typeof word === 'string' && word.length)) throw new Error('题库格式错误');
    return item;
  });
}
function load(listId) {
  const list = lists.find((item) => item.id === listId);
  if (!list) return Promise.reject(new Error('题库不存在'));
  if (bundled[listId]) return Promise.resolve().then(() => normalize(list, bundled[listId]));
  if (lastCache && lastCache.id === listId) return Promise.resolve(lastCache.items);
  if (!/^https:\/\//.test(config.apiBaseUrl)) return Promise.reject(new Error('在线题库需要先配置 HTTPS 服务域名'));
  return new Promise((resolve, reject) => {
    wx.request({ url: config.apiBaseUrl.replace(/\/$/, '') + list.file, timeout: 20000,
      success(response) {
        try {
          if (response.statusCode !== 200) throw new Error(`题库加载失败（${response.statusCode}）`);
          const rows = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          const items = normalize(list, rows); lastCache = { id: listId, items }; resolve(items);
        } catch (error) { reject(error instanceof SyntaxError ? new Error('题库数据格式错误') : error); }
      },
      fail() { reject(new Error('题库下载失败，请检查网络及微信 request 合法域名')); },
    });
  });
}
function cached(listId) { return bundled[listId] || (lastCache && lastCache.id === listId ? lastCache.items : null); }
module.exports = { lists, bundled, load, normalize, cached };
