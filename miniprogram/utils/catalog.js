const lists = require('../data/catalog');
function normalize(list, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length !== list.wordCount) throw new Error('题库数据不完整');
  return rows.map((item, index) => {
    if (typeof item.id !== 'string' || typeof item.zh !== 'string' || typeof item.english !== 'string' || !Array.isArray(item.words) || !item.words.length || !item.words.every((word) => typeof word === 'string' && word.length)) throw new Error('题库格式错误');
    return item;
  });
}
function load(listId) {
  const list = lists.find((item) => item.id === listId);
  if (!list) return Promise.reject(new Error('题库不存在'));
  const source = listId === 'home-phrases' ? require('../data/home-phrases') : require('../data/sentences');
  return Promise.resolve().then(() => normalize(list, source));
}
module.exports = { lists, load, normalize };
