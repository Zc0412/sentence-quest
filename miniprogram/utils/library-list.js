const { lists } = require('./catalog');
function libraryItems(state) {
  const counts = {};
  Object.keys(state.completed).forEach((key) => { const id = key.split('::')[0]; counts[id] = (counts[id] || 0) + 1; });
  const mistakes = new Set(Object.values(state.mistakes || {}).map((entry) => entry && entry.listId).filter(Boolean));
  return lists.map((list, index) => {
    const completed = Math.min(counts[list.id] || 0, list.wordCount);
    const cursor = Math.max(0, Number(state.cursors[list.id]) || 0);
    const started = completed > 0 || cursor > 0 || mistakes.has(list.id) || Boolean(state.startedLists && state.startedLists[list.id]);
    return Object.assign({}, list, { completed, started, inProgress: started && completed < list.wordCount,
      percent: Math.min(100, Math.round(completed / list.wordCount * 100)), colorIndex: index % 6 });
  });
}
function recentIds(state) {
  const history = Array.isArray(state.recentLists) ? state.recentLists.filter((id) => typeof id === 'string') : [];
  if (state.lastList && Object.prototype.hasOwnProperty.call(state.cursors, state.lastList)) history.unshift(state.lastList);
  return [...new Set(history)].filter((id) => lists.some((list) => list.id === id));
}
module.exports = { libraryItems, recentIds };
