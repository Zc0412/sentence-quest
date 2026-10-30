const lists = require('../data/catalog');
const bundled = { 'home-phrases': require('../data/home-phrases'), sentences: require('../data/sentences'), 'vocabulary-dev-test': require('../data/vocabulary-dev-test') };
function normalize(list, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length !== list.wordCount) throw new Error('题库数据不完整，请重新加载');
  return rows.map((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.zh !== 'string' || typeof item.english !== 'string' || !Array.isArray(item.words) || !item.words.length || !item.words.every((word) => typeof word === 'string' && word.length)) throw new Error('题库格式错误');
    return item;
  });
}
function load(listId) {
  const list = lists.find((item) => item.id === listId);
  if (!list || !bundled[listId]) return Promise.reject(new Error('题库不存在'));
  return Promise.resolve().then(() => normalize(list, bundled[listId]));
}
function cached(listId) { return bundled[listId] || null; }
module.exports = { lists, bundled, load, normalize, cached };
