/** 汇总内置和云端题库，按版本缓存云端内容供练习使用。 */
import initialLists from '../data/catalog';
import homePhrases from '../data/home-phrases';
import sentences from '../data/sentences';
import vocabularyDevTest from '../data/vocabulary-dev-test';
import { cloudGet } from './cloud-api';
const bundled = { 'home-phrases': homePhrases, sentences, 'vocabulary-dev-test': vocabularyDevTest };
const lists: any[] = initialLists.slice();
const memory: Record<string, any[]> = {};
const CATALOG_KEY = 'sentleap:cloud-catalog:v1';

/** 校验练习页依赖的字段和条目数量。 */
function normalize(list, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length !== list.wordCount) throw new Error('题库数据不完整，请重新加载');
  return rows.map((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.zh !== 'string' || typeof item.english !== 'string' || !Array.isArray(item.words) || !item.words.length || !item.words.every((word) => typeof word === 'string' && word.length)) throw new Error('题库格式错误');
    return item;
  });
}

/** 将云端目录合并进内置目录，避免云端同名记录覆盖离线题库。 */
function applyCatalog(rows) {
  if (!Array.isArray(rows)) throw new Error('题库目录格式错误');
  const selected = rows.filter((row) => row && typeof row.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(row.id) && typeof row.label === 'string' && typeof row.category === 'string' && ['word', 'phrase'].includes(row.kind) && Number.isInteger(row.wordCount) && row.wordCount > 0 && typeof row.sha256 === 'string' && /^[a-f0-9]{64}$/.test(row.sha256) && !bundled[row.id]);
  lists.splice(initialLists.length, lists.length, ...selected.map((row) => ({ ...row, bundled: false })));
}

/** 恢复上次获取的目录，网络不可用时仍能显示已缓存题库。 */
function restoreCatalog() { try { const rows = wx.getStorageSync(CATALOG_KEY); if (rows) applyCatalog(rows); } catch (_) {} }
restoreCatalog();

/** 刷新云端目录；失败时保留本地目录和离线题库。 */
async function refreshCloud() {
  const result = await cloudGet('/api/dictionaries');
  applyCatalog(result.dictionaries);
  try { wx.setStorageSync(CATALOG_KEY, result.dictionaries); } catch (_) {}
}

/** 将上传脚本支持的原始单词格式转换为练习页格式。 */
function convertWord(listId, item, index) {
  if (!item || typeof item.name !== 'string' || !item.name.trim() || !Array.isArray(item.trans) || !item.trans.length || !item.trans.every((v) => typeof v === 'string' && v.trim())) throw new Error('单词题库格式错误');
  const meaning = item.trans.join('；').replace(/^[a-z]+\.\s*/i, '');
  return { id: `${listId}:${index + 1}`, zh: meaning, english: item.name, words: [item.name], note: '', grammar: [], annotations: [{ phonetic: item.ukphone ? `/${item.ukphone}/` : '', usphone: item.usphone ? `/${item.usphone}/` : '', meaning, pos: item.trans[0].match(/^[a-z]+\./i)?.[0] || '', color: '#3b82f6' }] };
}

/** 优先使用当前版本缓存，否则下载云端 JSON 并校验。 */
async function load(listId) {
  const list = lists.find((item) => item.id === listId);
  if (!list) throw new Error('题库不存在');
  if (bundled[listId]) return normalize(list, bundled[listId]);
  const key = `sentleap:dictionary:${listId}:${list.sha256}`;
  if (memory[key]) return memory[key];
  try { const saved = wx.getStorageSync(key); if (saved) { memory[key] = normalize(list, saved); return memory[key]; } } catch (_) {}
  const raw = []; let offset = 0;
  do {
    const page = await cloudGet(`/api/dictionaries/${encodeURIComponent(listId)}/content?offset=${offset}&version=${encodeURIComponent(list.sha256)}`);
    if (!page || page.sha256 !== list.sha256 || !Array.isArray(page.items) || (page.next !== null && (!Number.isSafeInteger(page.next) || page.next !== offset + page.items.length || page.next <= offset))) throw new Error('题库分页数据无效');
    raw.push(...page.items);
    if (raw.length > list.wordCount) throw new Error('题库数据不完整，请重新加载');
    offset = page.next;
  } while (offset !== null);
  const rows = normalize(list, list.kind === 'word' ? raw.map((item, index) => convertWord(listId, item, index)) : raw);
  memory[key] = rows;
  try { wx.setStorageSync(key, rows); } catch (_) { /* 缓存空间不足时仍可进行本次练习。 */ }
  return rows;
}

/** 返回已加载的题目，用于首页预览。 */
function cached(listId) { const list = lists.find((item) => item.id === listId); return bundled[listId] || (list && memory[`sentleap:dictionary:${listId}:${list.sha256}`]) || null; }
export { lists, bundled, load, normalize, cached, refreshCloud };
