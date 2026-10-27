import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sentences = JSON.parse(readFileSync(new URL('../src/data/sentences.json', import.meta.url), 'utf8'));
const vocabularyLists = JSON.parse(readFileSync(new URL('../src/data/vocabulary-catalog.json', import.meta.url), 'utf8'));
assert.ok(vocabularyLists.length > 0, '词典目录不能为空');
assert.equal(new Set(vocabularyLists.map((list) => list.id)).size, vocabularyLists.length, '词典 ID 必须唯一');
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

for (const { id, label, wordCount, sha256 } of vocabularyLists) {
  assert.match(id, /^[A-Za-z0-9_.-]+$/, '词典 ID 无效');
  const content = readFileSync(new URL(`../public/dictionaries/words/${id}.json`, import.meta.url), 'utf8');
  // Git may check text files out with CRLF on Windows. Hash normalized content so
  // the catalog checksum represents the data rather than the local line endings.
  const normalizedContent = content.replace(/\r\n/g, '\n');
  assert.equal(createHash('sha256').update(normalizedContent).digest('hex'), sha256, `${label} 文件校验失败`);
  const vocabulary = JSON.parse(content);
  assert.equal(vocabulary.length, wordCount, `${label} 目录词数不一致`);
  assert.ok(Array.isArray(vocabulary) && vocabulary.length > 0, `${label} 词库不能为空`);
  const vocabularyNames = new Set();
  for (const [index, word] of vocabulary.entries()) {
    const prefix = `${label} 第 ${index + 1} 个单词`;
    assert.ok(typeof word.name === 'string' && word.name.trim(), `${prefix} 缺少单词`);
    const normalizedName = word.name.trim().toLocaleLowerCase('en-US');
    assert.ok(!vocabularyNames.has(normalizedName), `${prefix} 重复: ${word.name}`);
    vocabularyNames.add(normalizedName);
    assert.ok(Array.isArray(word.trans) && word.trans.length > 0 && word.trans.every((meaning) => typeof meaning === 'string' && meaning.trim()), `${prefix} 释义无效`);
    for (const key of ['usphone', 'ukphone']) {
      assert.ok(word[key] === undefined || typeof word[key] === 'string', `${prefix} ${key} 必须为字符串`);
    }
  }

}

console.log(`✅ ${vocabularyLists.length} 本词库：文件摘要、词数、名称唯一性、释义和音标检查通过。`);
