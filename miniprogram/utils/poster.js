const storage = require('./storage');
const { bundled, lists } = require('./catalog');
const { streak } = require('./preferences');

function posterData(state, now = new Date()) {
  const today = storage.dateKey(now);
  const last = state.lastCompleted;
  const rows = last && bundled[last.listId];
  const completed = rows && rows.find((item) => item.id === last.itemId);
  const recommended = bundled['home-phrases'][0];
  const item = completed || recommended;
  const phraseList = lists.find((list) => list.id === 'home-phrases');
  const count = Object.keys(state.completed).filter((key) => key.startsWith('home-phrases::')).length;
  return {
    date: today.replace(/-/g, '.'), todayCount: state.activity[today] || 0,
    phraseLabel: completed && last.date === today ? (last.listId === 'vocabulary-dev-test' ? "TODAY'S WORD" : "TODAY'S PHRASE") : 'FEATURED PHRASE',
    zh: item.zh, english: item.english,
    xp: state.xp, streak: streak(state.activity, now),
    percent: Math.min(100, Math.round(count / phraseList.wordCount * 100)),
  };
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  ctx.setFillStyle(fill); ctx.fill();
  if (stroke) { ctx.setStrokeStyle(stroke); ctx.setLineWidth(1); ctx.stroke(); }
}
function text(ctx, value, x, y, size, color, align = 'left') {
  ctx.setTextAlign(align); ctx.setFillStyle(color); ctx.setFontSize(size);
  if (size >= 16) ctx.font = `bold ${size}px sans-serif`;
  ctx.fillText(String(value), x, y);
}
function lines(ctx, value, width, maxLines) {
  const characters = Array.from(value); const result = []; let line = '';
  for (const character of characters) {
    if (line && ctx.measureText(line + character).width > width) { result.push(line.trim()); line = character; }
    else line += character;
  }
  if (line) result.push(line.trim());
  if (result.length > maxLines) {
    const last = result[maxLines - 1]; let shortened = last;
    while (shortened && ctx.measureText(shortened + '…').width > width) shortened = shortened.slice(0, -1);
    return result.slice(0, maxLines - 1).concat(shortened + '…');
  }
  return result;
}
function renderPoster(ctx, data, width) {
  ctx.scale(width / 390, width / 390);
  const bg = ctx.createLinearGradient(0, 0, 390, 693);
  bg.addColorStop(0, '#e4edff'); bg.addColorStop(1, '#eaf8f6'); ctx.setFillStyle(bg); ctx.fillRect(0, 0, 390, 693);
  // Soft radial gradients keep the exported canvas consistent with its preview.
  for (const [x, y, radius, color] of [[35, 112, 190, '79,134,247'], [325, 214, 160, '177,151,252'], [35, 550, 180, '110,231,210'], [340, 635, 180, '79,214,192'], [185, 350, 120, '255,210,154']]) {
    const glow = ctx.createCircularGradient(x, y, radius); glow.addColorStop(0, `rgba(${color},.68)`); glow.addColorStop(1, `rgba(${color},0)`);
    ctx.setFillStyle(glow); ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const blue = '#2f6fed'; const ink = '#0f172a'; const muted = '#475569';
  ctx.drawImage('/assets/library-logo.png', 26, 30, 92, 34);
  text(ctx, data.date, 364, 50, 12, muted, 'right');
  text(ctx, '今日打卡', 26, 105, 14, muted);
  const countSize = String(data.todayCount).length > 3 ? 42 : 68;
  text(ctx, data.todayCount, 26, 176, countSize, blue);
  ctx.setFontSize(countSize); const labelX = Math.min(206, Math.max(92, 36 + ctx.measureText(String(data.todayCount)).width));
  text(ctx, '次练习已完成', labelX, 173, 21, ink);
  roundRect(ctx, 26, 204, 338, 152, 26, 'rgba(255,255,255,.58)', 'rgba(255,255,255,.85)');
  text(ctx, data.phraseLabel, 44, 230, 11, muted);
  ctx.setFontSize(16); const zh = lines(ctx, data.zh, 302, 2); zh.forEach((line, index) => text(ctx, line, 44, 255 + index * 20, 16, ink));
  ctx.setFontSize(20); const english = lines(ctx, data.english, 302, 3); english.forEach((line, index) => text(ctx, line, 44, 280 + (zh.length - 1) * 20 + index * 23, 20, blue));
  roundRect(ctx, 26, 370, 338, 80, 22, 'rgba(255,255,255,.55)', 'rgba(255,255,255,.85)');
  text(ctx, `${data.xp} XP`, 82, 404, 21, '#b45309', 'center'); text(ctx, `${data.streak} 天`, 195, 404, 21, ink, 'center'); text(ctx, `${data.percent}%`, 308, 404, 21, blue, 'center');
  text(ctx, '经验值', 82, 428, 12, muted, 'center'); text(ctx, '连续练习', 195, 428, 12, muted, 'center'); text(ctx, '精选短语进度', 308, 428, 12, muted, 'center');
  roundRect(ctx, 26, 555, 338, 108, 24, 'rgba(255,255,255,.65)', 'rgba(255,255,255,.9)');
  roundRect(ctx, 40, 570, 78, 78, 14, 'rgba(255,255,255,.85)');
  ctx.drawImage('/assets/library-logo.png', 46, 596, 66, 24); text(ctx, '一起练习', 136, 599, 17, ink); text(ctx, '拼写英文短语，一句一跃', 136, 625, 12, muted);
}
module.exports = { posterData, renderPoster, lines };
