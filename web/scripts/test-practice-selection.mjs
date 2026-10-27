import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(relative, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, (name) => {
    assert.ok(name in mocks, `Unexpected import: ${name}`);
    return mocks[name];
  });
  return exports;
}

const { loadPhraseSentences } = load('src/data/phrase-sentences.ts');
const { phrasePracticeLists } = load('src/data/phrase-practice.ts');
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url) => new Response(readFileSync(new URL(`../public${url}`, import.meta.url), 'utf8'));
  const first = phrasePracticeLists[0];
  const sentences = await loadPhraseSentences(first);
  const [one, two] = sentences.filter((item) => item.category === first.categories[0].name);
  const completedIds = [one.id, one.id, `${phrasePracticeLists[1].id}:${two.id.split(':').at(-1)}`, two.id.split(':').at(-1)];
  const jsx = (type, props) => ({ type, props });
  const { default: PhraseCategoryDialog } = load('src/app/settings/phrase-category-dialog.tsx', {
    react: { useCallback: (fn) => fn },
    'react/jsx-runtime': { jsx },
    '@/data/phrase-sentences': { loadPhraseSentences },
    '@/utils/storage': { loadProgress: async () => ({ progress: { completedIds } }) },
    '@/components/PracticeSelectionDialog': { PracticeSelectionDialog: 'PracticeSelectionDialog' },
  });
  const panel = PhraseCategoryDialog({ list: first, current: true, currentCategory: one.category });
  assert.equal(panel.type, 'PracticeSelectionDialog');
  const items = await panel.props.loadItems();
  assert.equal(items.length, first.categories.length);
  const category = items.find((item) => item.id === one.category);
  assert.equal(category.mastered, 1, '重复记录、裸 ID 和其他题库的 ID 不应被计入');
  assert.equal(category.total, first.categories[0].count);
  assert.equal(category.active, true);
  assert.ok(category.href.endsWith(`category=${encodeURIComponent(one.category)}`));
  assert.ok(items.filter((item) => item.id !== one.category).every((item) => item.mastered === 0));
  completedIds.push(...sentences.filter((item) => item.category === one.category).map((item) => item.id));
  const refreshed = (await panel.props.loadItems()).find((item) => item.id === one.category);
  assert.equal(refreshed.mastered, refreshed.total, '再次打开时应读取最新完成记录');
  completedIds.length = 0;
  assert.ok((await panel.props.loadItems()).every((item) => item.mastered === 0), '清空进度后应显示零掌握');

  for (const list of phrasePracticeLists) {
    const data = await loadPhraseSentences(list);
    assert.ok(data.every((item) => item.id.startsWith(`${list.id}:`)));
    for (const category of list.categories) assert.equal(data.filter((item) => item.category === category.name).length, category.count);
  }
  globalThis.fetch = async () => new Response('{}');
  await assert.rejects(loadPhraseSentences(first), /格式/);
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(loadPhraseSentences(first), /503/);
  console.log('✅ 短语分类：共享选择组件、分类掌握数、题库隔离、进度刷新、空进度和加载失败通过');
} finally {
  globalThis.fetch = originalFetch;
}
