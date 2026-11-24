/** 按固定索引编辑已有题目，锁定身份字段，避免增删或排序造成进度错位。 */
import { InputError, validateEntries } from '../schemas/dictionary';
import type { Dictionary } from '../types/services';

export function editEntry(original: unknown, dictionary: Dictionary, index: number, entry: Record<string, unknown>) {
    validateEntries(original, dictionary.kind);
    if (original.length !== dictionary.wordCount || !Number.isInteger(index) || index < 0 || index >= original.length) {
        throw new InputError('题目索引或原题库条数无效');
    }
    const before = original[index] as Record<string, unknown>;
    const identity = dictionary.kind === 'word' ? 'name' : 'id';
    if (entry[identity] !== before[identity] || entry.id !== before.id) {
        throw new InputError('不能修改单词名称或题目 ID');
    }
    const entries = [...original];
    entries[index] = entry;
    validateEntries(entries, dictionary.kind);
    return entries;
}
