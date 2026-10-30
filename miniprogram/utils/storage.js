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
function mistake(listId, item, reason) {
  const mistakes = read().mistakes; const id = key(listId, item);
  const previous = mistakes[id];
  const validReason = ['error', 'hint', 'skip'].includes(reason) ? reason : previous && previous.reason;
  mistakes[id] = { listId, item, ...(validReason ? { reason: validReason } : {}) };
  save();
}
function complete(listId, item, perfect, review) {
  const state = read(); const id = key(listId, item);
  const first = !state.completed[id];
  const earned = practiceXp(first, perfect);
  state.completed[id] = true; state.xp += earned;
  if (!state.masteredItems || typeof state.masteredItems !== 'object' || Array.isArray(state.masteredItems)) state.masteredItems = {};
  if (!state.masteredItems[id]) {
    const annotation = (item.annotations || [])[0] || {};
    state.masteredItems[id] = { english: item.english, zh: item.zh, phonetic: annotation.phonetic || '', usphone: annotation.usphone || '' };
  }
  if (earned > 0) {
    const now = new Date();
    if (!Array.isArray(state.xpHistory)) state.xpHistory = [];
    if (!state.xpDaily || typeof state.xpDaily !== 'object' || Array.isArray(state.xpDaily)) state.xpDaily = {};
    const date = dateKey(now);
    state.xpDaily[date] = (state.xpDaily[date] || 0) + earned;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    state.xpHistory.unshift({ date, time, listId, amount: earned, perfect: !!perfect, review: !!review });
    if (state.xpHistory.length > 500) state.xpHistory.length = 500;
    Object.keys(state.xpDaily).sort().slice(0, -90).forEach((day) => delete state.xpDaily[day]);
  }
  state.lastCompleted = { listId, itemId: item.id, date: dateKey(), zh: item.zh, english: item.english };
  if (review && perfect) delete state.mistakes[id];
  const today = dateKey();
  state.activity[today] = (state.activity[today] || 0) + 1;
  save(); return earned;
}
function cursor(listId, index, item) {
  const state = read(); state.cursors[listId] = index; state.lastList = listId;
  if (item && typeof item.zh === 'string') state.lastPreview = { listId, index, zh: item.zh };
  else if (!state.lastPreview || state.lastPreview.listId !== listId || state.lastPreview.index !== index) delete state.lastPreview;
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
function localUserId() {
  const state = read();
  if (typeof state.localUserId === 'string' && /^\d{18}$/.test(state.localUserId)) return state.localUserId;
  const previous = state.localUserId;
  const id = `${Date.now()}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  state.localUserId = id;
  if (save()) return id;
  if (previous === undefined) delete state.localUserId;
  else state.localUserId = previous;
  return '';
}
module.exports = { read, save, key, mistake, complete, cursor, settings, dateKey, typingStats, recordTyping, localUserId };
