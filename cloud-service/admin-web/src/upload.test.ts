import { test } from "node:test";
import assert from "node:assert/strict";
import { detectEntriesKind, parseEntries } from "./upload";

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

test("上传完整示例时识别类型并保留音标，不猜测混合或无效文件", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const [file, kind] of [
    ["words", "word"],
    ["phrases", "phrase"],
  ] as const) {
    const source = await readFile(
      new URL(`../../examples/${file}.json`, import.meta.url),
      "utf8",
    );
    assert.equal(detectEntriesKind(source), kind);
    const rows = parseEntries(source, kind);
    assert.deepEqual(rows, JSON.parse(source));
    assert.ok(kind === "word" ? rows[0].ukphone : rows[0].annotations);
  }
  const word = { name: "hello", trans: ["你好"] };
  const phrase = { id: "p1", zh: "你好", english: "hello", words: ["hello"] };
  assert.equal(detectEntriesKind(JSON.stringify([word, phrase])), null);
  assert.equal(
    detectEntriesKind(JSON.stringify([{ ...word, ...phrase }])),
    null,
  );
  assert.equal(detectEntriesKind(JSON.stringify([phrase, phrase])), null);
  assert.equal(detectEntriesKind("[]"), null);
  assert.equal(detectEntriesKind("{"), null);
});
