import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntries } from "./upload";

test("上传预检保留顺序、ID 和扩展字段，兼容 BOM", () => {
  const rows = [
    { name: "dog", trans: ["狗"], phone: "test" },
    { name: "cat", trans: ["猫"] },
  ];
  assert.deepEqual(parseEntries("\uFEFF" + JSON.stringify(rows), "word"), rows);
});
test("拒绝错误 JSON、空库、类型不匹配和重复题目 ID", () => {
  assert.throws(() => parseEntries("{", "word"), /JSON/);
  assert.throws(() => parseEntries("[]", "word"), /非空/);
  assert.throws(
    () => parseEntries('[{"name":"x","trans":[]}]', "word"),
    /第 1 条/,
  );
  const row = { id: "p1", zh: "你好", english: "Hello", words: ["Hello"] };
  assert.throws(
    () => parseEntries(JSON.stringify([row, row]), "phrase"),
    /ID 重复/,
  );
  assert.throws(() => parseEntries(JSON.stringify([row]), "word"), /第 1 条/);
});
