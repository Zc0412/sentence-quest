const { practiceXp } = require('./practice-xp');
const KEY = 'sentleap:miniprogram:v1';
let cached;
let failed = false;
const empty = () => ({ version: 1, xp: 0, completed: {}, mistakes: {}, cursors: {}, activity: {}, settings: { accent: '1', hints: true }, lastList: 'home-phrases' });
function read() {
  if (cached) return cached;
  try {
    const value = wx.getStorageSync(KEY);
    if (!value) cached = empty();
    else if (value.version === 1 && ['completed', 'mistakes', 'cursors', 'activity', 'settings'].every((key) => value[key] && typeof value[key] === 'object' && !Array.isArray(value[key])) && Number.isFinite(value.xp)) cached = value;
    else throw new Error('Invalid progress');
  } catch (_) {
    cached = empty(); failed = true;
    wx.showToast({ title: '记录读取失败，本次仅临时保存', icon: 'none' });
  }
  return cached;
}
function save() {
  // Do not overwrite an unreadable existing record.
  if (failed) return false;
  try { wx.setStorageSync(KEY, read()); return true; }
  catch (_) { wx.showToast({ title: '保存失败，请检查设备空间', icon: 'none' }); return false; }
}
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function key(listId, item) { return `${listId}::${item.id}`; }
function mistake(listId, item) {
  read().mistakes[key(listId, item)] = { listId, item };
  save();
}
function complete(listId, item, perfect, review) {
  const state = read(); const id = key(listId, item);
  const first = !state.completed[id];
  const earned = practiceXp(first, perfect);
  state.completed[id] = true; state.xp += earned;
  state.lastCompleted = { listId, itemId: item.id, date: dateKey() };
  if (review && perfect) delete state.mistakes[id];
  const today = dateKey();
  state.activity[today] = (state.activity[today] || 0) + 1;
  save(); return earned;
}
function cursor(listId, index) {
  const state = read(); state.cursors[listId] = index; state.lastList = listId;
  const previous = Array.isArray(state.recentLists) ? state.recentLists : [];
  state.recentLists = [listId, ...previous.filter((id) => id !== listId)].slice(0, 20);
  save();
}
function typingStats() {
  const value = read().typing;
  return value && Number.isSafeInteger(value.input) && Number.isSafeInteger(value.correct) && value.input >= 0 && value.correct >= 0 && value.correct <= value.input ? value : { input: 0, correct: 0 };
}
function recordTyping(delta, listId) {
  if (!delta.input) return;
  const value = typingStats();
  const state = read();
  state.typing = { input: value.input + delta.input, correct: value.correct + delta.correct };
  if (typeof listId === 'string' && listId) {
    if (!state.startedLists || typeof state.startedLists !== 'object' || Array.isArray(state.startedLists)) state.startedLists = {};
    state.startedLists[listId] = true;
  }
  save();
}
function settings(value) { Object.assign(read().settings, value); save(); }
module.exports = { read, save, key, mistake, complete, cursor, settings, dateKey, typingStats, recordTyping };
