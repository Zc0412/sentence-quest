/** 校验管理员提交的题库信息并生成云存储文件。 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Dictionary } from './app';

export type DictionaryInput = {
  id?: unknown;
  label?: unknown;
  kind?: unknown;
  category?: unknown;
  status?: unknown;
  entries?: unknown;
};

export type DictionaryWrite = Dictionary & {
  cloudPath: string;
  updatedAt: string;
  createdAt?: string;
};

export class InputError extends Error {}

/** 仅接受部署环境配置的管理员令牌，未配置时关闭所有写入接口。 */
export function isAdmin(
  authorization: string | undefined,
  configuredToken: string | undefined,
): boolean {
  if (!configuredToken || configuredToken.length < 32 || !authorization?.startsWith('Bearer ')) {
    return false;
  }

  const expected = createHash('sha256').update(configuredToken).digest();
  const supplied = createHash('sha256').update(authorization.slice(7)).digest();
  return timingSafeEqual(expected, supplied);
}

/** 校验题库 ID，确保它不会改变云存储路径结构。 */
export function validId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id);
}

/** 校验题库条目并保持提交时的顺序。 */
export function validateEntries(entries: unknown, kind: string): asserts entries is unknown[] {
  if (!Array.isArray(entries) || !entries.length) {
    throw new InputError('题库必须是非空数组');
  }

  const ids = new Set<string>();

  entries.forEach((row, index) => {
    const validWord = row
      && typeof row.name === 'string'
      && row.name.trim()
      && Array.isArray(row.trans)
      && row.trans.length
      && row.trans.every((value: unknown) => typeof value === 'string' && value.trim());

    const validPhrase = row
      && typeof row.id === 'string'
      && row.id.trim()
      && typeof row.zh === 'string'
      && row.zh.trim()
      && typeof row.english === 'string'
      && row.english.trim()
      && Array.isArray(row.words)
      && row.words.length
      && row.words.every((word: unknown) => typeof word === 'string' && word.trim());

    if (!(kind === 'word' ? validWord : validPhrase)) {
      throw new InputError(`第 ${index + 1} 条题目格式错误`);
    }

    if (kind === 'phrase') {
      if (ids.has(row.id)) {
        throw new InputError(`第 ${index + 1} 条题目 ID 重复`);
      }
      ids.add(row.id);
    }
  });
}

/** 校验新增或修改字段，并在替换题目时生成内容哈希与云存储路径。 */
export function prepareDictionary(
  input: DictionaryInput,
  existing?: Dictionary,
): { fields: Partial<DictionaryWrite>; bytes?: Buffer } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InputError('请求内容无效');
  }

  const allowed = ['id', 'label', 'kind', 'category', 'status', 'entries'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    throw new InputError('包含不支持的字段');
  }

  const id = existing?.id || input.id;
  if (!validId(id) || (existing && input.id !== undefined && input.id !== id)) {
    throw new InputError('题库 ID 无效或不能修改');
  }

  const kind = input.kind ?? existing?.kind;
  if (!['word', 'phrase'].includes(kind as string) || (existing && kind !== existing.kind)) {
    throw new InputError('题库类型无效或不能修改');
  }

  const label = input.label ?? existing?.label;
  const category = input.category ?? existing?.category ?? (kind === 'word' ? '单词练习' : '短语练习');
  if (
    typeof label !== 'string'
    || !label.trim()
    || label.length > 100
    || typeof category !== 'string'
    || !category.trim()
    || category.length > 100
  ) {
    throw new InputError('题库名称或分类无效');
  }

  const status = input.status ?? existing?.status ?? 'published';
  if (!['published', 'draft', 'archived'].includes(status as string)) {
    throw new InputError('题库状态无效');
  }

  const fields: Partial<DictionaryWrite> = {
    id,
    kind: kind as string,
    label: label.trim(),
    category: category.trim(),
    status: status as string,
    updatedAt: new Date().toISOString(),
  };

  if (input.entries === undefined) {
    if (!existing) {
      throw new InputError('新增题库需要提供 entries');
    }
    return { fields };
  }

  validateEntries(input.entries, kind as string);
  const bytes = Buffer.from(JSON.stringify(input.entries), 'utf8');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  Object.assign(fields, {
    wordCount: input.entries.length,
    sha256,
    cloudPath: `dictionaries/${kind}/${id}/${sha256}.json`,
  });

  return { fields, bytes };
}
