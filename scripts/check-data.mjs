import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sentences = JSON.parse(readFileSync(new URL('../src/data/sentences.json', import.meta.url), 'utf8'));
const ids = new Set();

assert.ok(Array.isArray(sentences) && sentences.length > 0, '题库不能为空');

for (const [index, sentence] of sentences.entries()) {
  const prefix = `第 ${index + 1} 道题`;
  assert.ok(typeof sentence.id === 'string' && sentence.id.length > 0, `${prefix} 缺少 id`);
  assert.ok(!ids.has(sentence.id), `${prefix} id 重复: ${sentence.id}`);
  ids.add(sentence.id);
  assert.ok(typeof sentence.zh === 'string' && sentence.zh.length > 0, `${prefix} 缺少中文`);
  assert.ok(Array.isArray(sentence.words) && sentence.words.every((word) => typeof word === 'string' && word.trim()), `${prefix} words 不合法`);
  assert.ok(typeof sentence.note === 'string', `${prefix} 缺少语法说明`);
  const combined = sentence.words.join(' ');
  const displayedEnglish = sentence.english.replace(/[.!?]+$/u, '');
  assert.equal(combined, displayedEnglish, `${prefix} english 与 words 不一致`);
  assert.equal(sentence.annotations?.length, sentence.words.length, `${prefix} 单词注释数量不一致`);
  for (const annotation of sentence.annotations) {
    for (const key of ['phonetic', 'meaning', 'pos']) {
      assert.ok(typeof annotation[key] === 'string' && annotation[key].trim(), `${prefix} 缺少 ${key}`);
    }
    assert.match(annotation.color, /^#[0-9a-f]{6}$/i, `${prefix} 词性颜色无效`);
  }
  assert.ok(sentence.grammar?.length > 0, `${prefix} 缺少语法分组`);
  let nextWord = 0;
  for (const group of sentence.grammar) {
    assert.equal(group.start, nextWord, `${prefix} 语法分组重叠或遗漏`);
    assert.ok(Number.isInteger(group.end) && group.end > group.start && group.end <= sentence.words.length, `${prefix} 语法分组范围无效`);
    assert.ok(group.role && group.explanation, `${prefix} 缺少语法解释`);
    assert.match(group.color, /^#[0-9a-f]{6}$/i, `${prefix} 分组颜色无效`);
    nextWord = group.end;
  }
  assert.equal(nextWord, sentence.words.length, `${prefix} 语法分组未覆盖整句`);
}

console.log(`✅ 题库检查通过：${sentences.length} 道题，ID 唯一，英文字段与单词数组一致。`);
