const storage = require('./storage');
const goals = [5, 10, 20, 30, 50];
function preferences() {
  const value = storage.read().settings;
  return {
    accent: value.accent === '2' ? '2' : '1', hints: value.hints !== false,
    dailyGoal: goals.includes(value.dailyGoal) ? value.dailyGoal : 10,
    autoSpeak: value.autoSpeak !== false,
    nickname: typeof value.nickname === 'string' ? value.nickname : '',
  };
}
function streak(activity, now = new Date()) {
  const day = new Date(now); day.setHours(12, 0, 0, 0);
  if (!(activity[storage.dateKey(day)] > 0)) day.setDate(day.getDate() - 1);
  let count = 0;
  while (activity[storage.dateKey(day)] > 0) { count += 1; day.setDate(day.getDate() - 1); }
  return count;
}
module.exports = { preferences, goals, streak };
