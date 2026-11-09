import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/youth-grades.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { youthGrade, gradeLabels } = exports;
const catalog = JSON.parse(readFileSync(new URL('../src/data/vocabulary-catalog.json', import.meta.url), 'utf8'));
const youth = catalog.filter((list) => list.category === '青少年英语');
const find = (id) => catalog.find((list) => list.id === id);

assert.equal(youthGrade(find('PEPXiaoXue3_1_T')), '三年级');
assert.equal(youthGrade(find('jiJiao5-1')), '五年级');
assert.equal(youthGrade(find('jiJiao9')), '九年级');
for (const id of ['GaoKao_3500', 'nce-new-1', 'PEPGaoZhong_1_T', 'ZhongKaoHeXin']) {
  assert.equal(youthGrade(find(id)), undefined);
}
assert.equal(youthGrade({ category: '青少年英语', label: '三年级起点', description: '五年级上册' }), '五年级');
assert.equal(youthGrade({ category: '其他', label: '一年级', description: '' }), undefined);
const counts = gradeLabels.map((grade) => youth.filter((list) => youthGrade(list) === grade).length);
assert.deepEqual(counts, [4, 4, 10, 10, 10, 11, 8, 6, 4]);
assert.equal(youth.filter((list) => !youthGrade(list)).length, 39);
console.log('青少年题库年级分类通过：', counts);
