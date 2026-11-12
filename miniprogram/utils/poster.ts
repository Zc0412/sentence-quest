import { bundled, lists } from './catalog';
import { streak } from './preferences';
import * as storage from './storage';

function posterData(state, now = new Date()) {
  const today = storage.dateKey(now);
  const last = state.lastCompleted;
  const rows = last && bundled[last.listId];
  const completed =
    (rows && rows.find((item) => item.id === last.itemId)) ||
    (last && typeof last.zh === 'string' && typeof last.english === 'string'
      ? last
      : null);
  const recommended = bundled['home-phrases'][0];
  const item = completed || recommended;
  const phraseList = lists.find((list) => list.id === 'home-phrases');
  const count = Object.keys(state.completed).filter((key) =>
    key.startsWith('home-phrases::')
  ).length;
  return {
    date: today.replace(/-/g, '.'),
    todayCount: state.activity[today] || 0,
    phraseLabel:
      completed && last.date === today
        ? (lists.find((list) => list.id === last.listId) || {}).kind === 'word'
          ? "TODAY'S WORD"
          : "TODAY'S PHRASE"
        : 'FEATURED PHRASE',
    zh: item.zh,
    english: item.english,
    xp: state.xp,
    streak: streak(state.activity, now),
    percent: Math.min(100, Math.round((count / phraseList.wordCount) * 100)),
  };
}

function roundRect(ctx, x, y, w, h, r, fill, stroke?) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.setFillStyle(fill);
  ctx.fill();
  if (stroke) {
    ctx.setStrokeStyle(stroke);
    ctx.setLineWidth(1);
    ctx.stroke();
  }
}
// 用同色细描边加粗正文，避免真机忽略 font 的 bold 后导出细字；小字保持正常字重。
function text(ctx, value, x, y, size, color, align = 'left') {
  ctx.setTextAlign(align);
  ctx.setFillStyle(color);
  ctx.setFontSize(size);
  ctx.font = `normal ${size}px sans-serif`;
  const content = String(value);
  if (size >= 16) {
    ctx.setStrokeStyle(color);
    ctx.setLineWidth(Math.min(2, size * 0.045));
    ctx.strokeText(content, x, y);
  }
  ctx.fillText(content, x, y);
}
function lines(ctx, value: string, width, maxLines) {
  const characters = Array.from(value);
  const result = [];
  let line = '';
  for (const character of characters) {
    if (line && ctx.measureText(line + character).width > width) {
      result.push(line.trim());
      line = character;
    } else line += character;
  }
  if (line) result.push(line.trim());
  if (result.length > maxLines) {
    const last = result[maxLines - 1];
    let shortened = last;
    while (shortened && ctx.measureText(shortened + '…').width > width)
      shortened = shortened.slice(0, -1);
    return result.slice(0, maxLines - 1).concat(shortened + '…');
  }
  return result;
}
// 三种海报配色共用真实学习数据与绘制布局，确保保存图片与当前预览一致。
const posterThemes = [
  {
    id: 'blue',
    label: '经典蓝',
    dot: '#4f86f7',
    accent: '#2f6fed',
    background: ['#e4edff', '#eaf8f6'],
    glows: [
      '79,134,247',
      '177,151,252',
      '110,231,210',
      '79,214,192',
      '255,210,154',
    ],
  },
  {
    id: 'warm',
    label: '暖阳',
    dot: '#ffb36b',
    accent: '#e8590c',
    background: ['#fff0dc', '#ffe6ee'],
    glows: [
      '255,179,107',
      '255,143,168',
      '255,231,179',
      '255,200,87',
      '255,231,179',
    ],
  },
  {
    id: 'green',
    label: '清新绿',
    dot: '#34d399',
    accent: '#0f9d6e',
    background: ['#e3f8ef', '#e6f1ff'],
    glows: [
      '52,211,153',
      '96,165,250',
      '167,243,208',
      '45,212,191',
      '187,247,208',
    ],
  },
];

function renderPoster(ctx, data, width, themeId = 'blue') {
  const theme =
    posterThemes.find((item) => item.id === themeId) || posterThemes[0];
  ctx.scale(width / 390, width / 390);
  const bg = ctx.createLinearGradient(0, 0, 390, 693);
  bg.addColorStop(0, theme.background[0]);
  bg.addColorStop(1, theme.background[1]);
  ctx.setFillStyle(bg);
  ctx.fillRect(0, 0, 390, 693);
  // 用柔和径向渐变模拟毛玻璃背景，使导出与预览保持一致。
  for (const [x, y, radius, color] of [
    [35, 112, 190, theme.glows[0]],
    [325, 214, 160, theme.glows[1]],
    [35, 550, 180, theme.glows[2]],
    [340, 635, 180, theme.glows[3]],
    [185, 350, 120, theme.glows[4]],
  ] as Array<[number, number, number, string]>) {
    const glow = ctx.createCircularGradient(x, y, radius);
    glow.addColorStop(0, `rgba(${color},.68)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.setFillStyle(glow);
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const blue = theme.accent;
  const ink = '#0f172a';
  const muted = '#475569';
  ctx.drawImage('/assets/library-logo.png', 26, 30, 92, 34);
  text(ctx, data.date, 364, 50, 12, muted, 'right');
  text(ctx, '今日打卡', 26, 105, 14, muted);
  const countSize = String(data.todayCount).length > 3 ? 42 : 68;
  text(ctx, data.todayCount, 26, 176, countSize, blue);
  ctx.setFontSize(countSize);
  const labelX = Math.min(
    206,
    Math.max(92, 36 + ctx.measureText(String(data.todayCount)).width)
  );
  text(ctx, '次练习已完成', labelX, 173, 21, ink);
  roundRect(
    ctx,
    26,
    204,
    338,
    152,
    26,
    'rgba(255,255,255,.58)',
    'rgba(255,255,255,.85)'
  );
  text(ctx, data.phraseLabel, 44, 230, 11, muted);
  ctx.setFontSize(16);
  const zh = lines(ctx, data.zh, 302, 2);
  zh.forEach((line, index) => text(ctx, line, 44, 255 + index * 20, 16, ink));
  ctx.setFontSize(20);
  const english = lines(ctx, data.english, 302, 3);
  english.forEach((line, index) =>
    text(ctx, line, 44, 280 + (zh.length - 1) * 20 + index * 23, 20, blue)
  );
  roundRect(
    ctx,
    26,
    370,
    338,
    80,
    22,
    'rgba(255,255,255,.55)',
    'rgba(255,255,255,.85)'
  );
  text(ctx, `${data.xp} XP`, 82, 404, 21, '#b45309', 'center');
  text(ctx, `${data.streak} 天`, 195, 404, 21, ink, 'center');
  text(ctx, `${data.percent}%`, 308, 404, 21, blue, 'center');
  text(ctx, '经验值', 82, 428, 12, muted, 'center');
  text(ctx, '连续练习', 195, 428, 12, muted, 'center');
  text(ctx, '精选短语进度', 308, 428, 12, muted, 'center');
  roundRect(
    ctx,
    26,
    555,
    338,
    108,
    24,
    'rgba(255,255,255,.65)',
    'rgba(255,255,255,.9)'
  );
  // 图片自带白底，按圆角路径裁剪；恢复上下文后再绘制右侧文案。
  ctx.save();
  roundRect(ctx, 40, 570, 78, 78, 12, '#fff');
  ctx.clip();
  ctx.drawImage('/assets/share-miniprogram-code.jpg', 40, 570, 78, 78);
  ctx.restore();
  text(ctx, '扫码进入小程序', 136, 599, 17, ink);
  text(ctx, '拼写英文短语，一句一跃', 136, 625, 12, muted);
}
export { posterData, renderPoster, lines, posterThemes };
