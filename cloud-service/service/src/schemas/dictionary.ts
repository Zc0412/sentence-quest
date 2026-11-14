/** 校验管理员提交的题库信息并生成云存储文件。 */
import { createHash } from 'node:crypto';
import type { Dictionary } from '../types/services';
import {z} from '@hono/zod-openapi';
import {DictionaryIdSchema} from './http';

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const entryIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;

const WordEntrySchema = z.object({
    name: nonEmptyString,
    trans: z.array(nonEmptyString).min(1),
}).passthrough().openapi('WordEntry');

const PhraseEntrySchema = z.object({
    id: nonEmptyString,
    zh: nonEmptyString,
    english: nonEmptyString,
    words: z.array(nonEmptyString).min(1),
}).passthrough().openapi('PhraseEntry');

const DictionaryFieldsSchema = {
    id: z.string().regex(entryIdPattern).openapi({
        description: '题库 ID，只允许字母、数字、点、下划线和连字符',
        example: 'cet4',
    }),
    label: nonEmptyString.max(100),
    category: nonEmptyString.max(100).optional(),
    status: z.enum(['published', 'draft', 'archived']).optional(),
};

const CreateWordDictionarySchema = z.object({
    ...DictionaryFieldsSchema,
    kind: z.literal('word'),
    entries: z.array(WordEntrySchema).min(1),
}).strict().openapi('CreateWordDictionaryRequest');

const CreatePhraseDictionarySchema = z.object({
    ...DictionaryFieldsSchema,
    kind: z.literal('phrase'),
    entries: z.array(PhraseEntrySchema).min(1),
}).strict().openapi('CreatePhraseDictionaryRequest');

export const CreateDictionarySchema = z.discriminatedUnion('kind', [
    CreateWordDictionarySchema,
    CreatePhraseDictionarySchema,
]).openapi('CreateDictionaryRequest');

export const UpdateDictionarySchema = z.object({
    label: nonEmptyString.max(100).optional(),
    category: nonEmptyString.max(100).optional(),
    status: z.enum(['published', 'draft', 'archived']).optional(),
    entries: z.array(z.union([WordEntrySchema, PhraseEntrySchema])).min(1).optional(),
}).strict().refine((value) => Object.keys(value).length > 0).openapi('UpdateDictionaryRequest');

export type DictionaryInput = z.infer<typeof CreateDictionarySchema> | z.infer<typeof UpdateDictionarySchema>;
export type DictionaryWrite = Dictionary & {
    cloudPath: string;
    updatedAt: string;
    createdAt?: string;
};
export class InputError extends Error {
}
/** 校验题库 ID，确保它不会改变云存储路径结构。 */
export function validId(id: unknown): id is string {
    return DictionaryIdSchema.safeParse(id).success;
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
export function prepareDictionary(input: DictionaryInput, existing?: Dictionary): {
    fields: Partial<DictionaryWrite>;
    bytes?: Buffer;
} {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new InputError('请求内容无效');
    }
    const allowed = ['id', 'label', 'kind', 'category', 'status', 'entries'];
    if (Object.keys(input).some((key) => !allowed.includes(key))) {
        throw new InputError('包含不支持的字段');
    }
    const requestedId = 'id' in input ? input.id : undefined;
    const requestedKind = 'kind' in input ? input.kind : undefined;
    const id = existing?.id || requestedId;
    if (!validId(id) || (existing && requestedId !== undefined && requestedId !== id)) {
        throw new InputError('题库 ID 无效或不能修改');
    }
    const kind = requestedKind ?? existing?.kind;
    if (!['word', 'phrase'].includes(kind as string) || (existing && kind !== existing.kind)) {
        throw new InputError('题库类型无效或不能修改');
    }
    const label = input.label ?? existing?.label;
    const category = input.category ?? existing?.category ?? (kind === 'word' ? '单词练习' : '短语练习');
    if (typeof label !== 'string'
        || !label.trim()
        || label.length > 100
        || typeof category !== 'string'
        || !category.trim()
        || category.length > 100) {
        throw new InputError('题库名称或分类无效');
    }
    const status = input.status ?? existing?.status ?? 'published';
    if (!['published', 'draft', 'archived'].includes(status as string)) {
        throw new InputError('题库状态无效');
    }
    const fields: Partial<DictionaryWrite> = {
        id,
        kind: kind as 'word' | 'phrase',
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
