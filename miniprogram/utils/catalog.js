const lists = require('../data/catalog');
const config = require('../config');
let lastCache;
function normalize(list, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length !== list.wordCount) throw new Error('题库数据不完整');
  return rows.map((item, index) => {
    if (list.kind === 'word') {
      if (typeof item.name !== 'string' || !item.name.trim() || !Array.isArray(item.trans)) throw new Error('词库格式错误');
      return { id: `${list.id}:${index}`, english: item.name, zh: item.trans.join('；'), words: [item.name], annotations: [{ phonetic: item.ukphone || item.usphone || '', usphone: item.usphone || '', meaning: item.trans.join('；') }], note: '', grammar: [] };
    }
    if (typeof item.id !== 'string' || typeof item.zh !== 'string' || typeof item.english !== 'string' || !Array.isArray(item.words) || !item.words.length || !item.words.every((word) => typeof word === 'string' && word.length)) throw new Error('题库格式错误');
    return item;
  });
}
function load(listId) {
  const list = lists.find((item) => item.id === listId);
  if (!list) return Promise.reject(new Error('题库不存在'));
  if (lastCache && lastCache.id === listId) return Promise.resolve(lastCache.items);
  let source;
  if (listId === 'home-phrases') source = require('../data/home-phrases');
  if (listId === 'sentences') source = require('../data/sentences');
  if (listId === 'CET4_T') source = require('../data/cet4');
  if (source) return Promise.resolve(normalize(list, source));
  if (!/^https:\/\//.test(config.apiBaseUrl)) return Promise.reject(new Error('此题库需先在 config.js 配置 Web 服务 HTTPS 域名；可先练习内置题库'));
  return new Promise((resolve, reject) => wx.request({
    url: config.apiBaseUrl.replace(/\/$/, '') + list.file, timeout: 20000,
    success(response) {
      try {
        if (response.statusCode !== 200) throw new Error(`题库加载失败（${response.statusCode}）`);
        const items = normalize(list, response.data); lastCache = { id: listId, items }; resolve(items);
      } catch (error) { reject(error); }
    },
    fail() { reject(new Error('网络连接失败，请重试并检查服务域名配置')); },
  }));
}
module.exports = { lists, load, normalize };
