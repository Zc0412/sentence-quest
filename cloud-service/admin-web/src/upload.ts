/** 上传前仅做本地预检，不改变题目 ID、内容或顺序；最终校验仍由服务端完成。 */
export function parseEntries(
  source: string,
  kind: "word" | "phrase",
): Record<string, unknown>[] {
  let rows: unknown;
  try {
    rows = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("JSON 格式无效，请检查文件");
  }
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error("题库必须是非空数组");
  const nonempty = (value: unknown): value is string =>
    typeof value === "string" && !!value.trim();
  const texts = (value: unknown) =>
    Array.isArray(value) && value.length > 0 && value.every(nonempty);
  const ids = new Set<string>();
  return rows.map((value, index) => {
    const row = value as Record<string, unknown>;
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw new Error(`第 ${index + 1} 条必须是对象`);
    if (
      kind === "word"
        ? !(nonempty(row.name) && texts(row.trans))
        : !(
            nonempty(row.id) &&
            nonempty(row.zh) &&
            nonempty(row.english) &&
            texts(row.words)
          )
    ) {
      throw new Error(
        `第 ${index + 1} 条格式错误：${kind === "word" ? "需要 name 和非空 trans 数组" : "需要 id、zh、english 和非空 words 数组"}`,
      );
    }
    if (kind === "phrase") {
      if (ids.has(row.id as string))
        throw new Error(`第 ${index + 1} 条题目 ID 重复`);
      ids.add(row.id as string);
    }
    return row;
  });
}
