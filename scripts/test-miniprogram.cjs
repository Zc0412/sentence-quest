const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../miniprogram');
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const all = files(root);
for (const file of all) {
  if (file.endsWith('.js')) new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  if (file.endsWith('.json')) JSON.parse(fs.readFileSync(file, 'utf8'));
}
const config = require('../miniprogram/app.json');
for (const page of config.pages) for (const extension of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(path.join(root, `${page}.${extension}`)));
for (const tab of config.tabBar.list) assert.ok(config.pages.includes(tab.pagePath));
const generated = all.filter((file) => /\/data\/|\/(validator|practice-xp)\.js$/.test(file));
const before = generated.map((file) => fs.readFileSync(file, 'utf8'));
cp.execFileSync(process.execPath, [path.join(__dirname, 'sync-miniprogram.mjs')]);
generated.forEach((file, index) => assert.equal(fs.readFileSync(file, 'utf8'), before[index], `生成文件已过期：${file}`));
const packageBytes = all.reduce((sum, file) => sum + fs.statSync(file).size, 0);
assert.ok(packageBytes < 2 * 1024 * 1024, '内置包超过 2 MiB 预算');

let saved; let failWrite = false; let failRead = false; const toasts = [];
global.wx = {
  getStorageSync() { if (failRead) throw new Error('read failure'); return saved && JSON.parse(JSON.stringify(saved)); },
  setStorageSync(key, value) { if (failWrite) throw new Error('quota'); saved = JSON.parse(JSON.stringify(value)); },
  showToast(value) { toasts.push(value); }, hideKeyboard() {}, setNavigationBarTitle() {},
};
const storagePath = require.resolve('../miniprogram/utils/storage');
let storage = require(storagePath);
const session = require('../miniprogram/utils/session');
const catalog = require('../miniprogram/utils/catalog');
const item = { id: 'test', words: ['I', 'like', 'café'], english: 'I like café', zh: '我喜欢咖啡', annotations: [] };
let state = session.start(item);
state = session.input(state, 'i'); assert.equal(state.wordIndex, 1);
state = session.input(state, 'lx'); assert.ok(state.error); assert.equal(state.typed, 'lx');
state = session.input(state, 'like'); state = session.input(state, 'cafe');
assert.ok(state.done); assert.ok(state.dirty);
state = session.hint(session.start(item)); assert.equal(state.revealed, 1); assert.ok(state.dirty); assert.ok(!state.done);
let spaced = session.start({ words: ['pencil box'] });
spaced = session.input(spaced, 'pencilbox'); assert.ok(spaced.done);
storage.mistake('one', item); storage.mistake('two', item); assert.equal(Object.keys(storage.read().mistakes).length, 2);
assert.equal(storage.complete('one', item, true, true), 15);
assert.equal(Object.keys(storage.read().mistakes).length, 1);
assert.equal(storage.complete('one', item, true, true), 0);
assert.equal(storage.complete('two', item, false, true), 10);
assert.equal(Object.keys(storage.read().mistakes).length, 1, '有错误的复习不能移除错题');
storage.cursor('one', 8); storage.settings({ accent: '2' });
delete require.cache[storagePath]; storage = require(storagePath);
assert.equal(storage.read().cursors.one, 8); assert.equal(storage.read().settings.accent, '2'); assert.equal(storage.read().xp, 25);
failWrite = true; storage.cursor('one', 9); assert.ok(toasts.length); assert.equal(saved.cursors.one, 8); failWrite = false;
failRead = true; delete require.cache[storagePath]; const broken = require(storagePath);
broken.cursor('bad', 4); assert.equal(saved.cursors.one, 8, '读取故障不能覆盖原存档'); failRead = false;
delete require.cache[storagePath];

(async () => {
  for (const list of catalog.lists) {
    const rows = list.bundled ? await catalog.load(list.id) : catalog.normalize(list, JSON.parse(fs.readFileSync(path.resolve(__dirname, '../web/public' + list.file), 'utf8')));
    assert.equal(rows.length, list.wordCount); assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  }
  await assert.rejects(catalog.load('missing'), /不存在/);
  await assert.rejects(catalog.load('CET6_T'), /HTTPS/);
  const remoteConfig = require('../miniprogram/config'); remoteConfig.apiBaseUrl = 'https://example.test';
  wx.request = ({ success }) => success({ statusCode: 503 });
  await assert.rejects(catalog.load('CET6_T'), /503/);
  wx.request = ({ fail }) => fail(); await assert.rejects(catalog.load('CET6_T'), /网络/);
  wx.request = ({ success }) => success({ statusCode: 200, data: [] });
  await assert.rejects(catalog.load('CET6_T'), /不完整/);
  remoteConfig.apiBaseUrl = '';

  let definition; global.Page = (value) => { definition = value; };
  require('../miniprogram/pages/practice/index');
  const page = Object.assign({}, definition, { data: { ...definition.data }, setData(value) { Object.assign(this.data, value); } });
  page.options = { list: 'home-phrases' }; page.review = false;
  await page.load(); assert.equal(page.data.loading, false); assert.ok(page.entry);
  const initialIndex = page.index;
  page.keyboard({ detail: { height: 300 } }); assert.equal(page.data.keyboardHeight, 300);
  page.input({ detail: { value: 'zzz' } }); assert.ok(page.data.error);
  for (const word of page.entry.item.words) page.input({ detail: { value: word } });
  assert.ok(page.data.done); assert.equal(page.data.keyboardHeight, 0); assert.equal(page.data.earned, 10);
  page.next(); assert.equal(page.index, initialIndex + 1); assert.ok(!page.data.done); assert.equal(page.data.typed, '');
  page.hint(); assert.ok(page.data.hintText); page.skip(); assert.equal(page.index, initialIndex + 2);
  const persisted = require(storagePath);
  const review = Object.assign({}, definition, { data: { ...definition.data }, options: {}, review: true, setData(value) { Object.assign(this.data, value); } });
  await review.load(); const count = Object.keys(persisted.read().mistakes).length;
  for (const word of review.entry.item.words) review.input({ detail: { value: word } });
  assert.equal(Object.keys(persisted.read().mistakes).length, count - 1);
  review.index = review.entries.length; review.begin(); assert.ok(review.data.finished);
  console.log(`✅ 小程序：${catalog.lists.length} 个题库校验，生成数据一致性，逐词输入 / 提示 / 错题 / XP / 持久化 / 存储与网络故障 / 页面流程通过；包文件 ${(packageBytes / 1024).toFixed(0)} KiB。`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
