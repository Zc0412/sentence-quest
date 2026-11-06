/** 使用 Drizzle ORM 读写题库资料，复用现有 mysql2 连接池。 */
import type {Pool} from 'mysql2/promise';
import {drizzle} from 'drizzle-orm/mysql2';
import {eq} from 'drizzle-orm';
import {dictionaries} from '../db/schema';
import type {DictionaryWrite} from '../schemas/dictionary';

/** 创建题库仓储；ORM 自动绑定查询参数。 */
export function createDictionaryRepository(pool: Pool) {
    const db = drizzle(pool);
    return {
        /** 查询目录并按 ID 排序。 */
        async list(): Promise<DictionaryWrite[]> {
            return db.select().from(dictionaries).orderBy(dictionaries.id);
        },
        /** 按主键获取题库，缺失时返回 undefined。 */
        async get(id: string): Promise<DictionaryWrite | undefined> {
            const rows = await db.select().from(dictionaries).where(eq(dictionaries.id, id));
            return rows[0];
        },
        /** 新建题库登记，重复 ID 由数据库唯一约束拒绝。 */
        async create(record: DictionaryWrite): Promise<void> {
            await db.insert(dictionaries).values({
                ...record,
                kind: record.kind as 'word' | 'phrase',
                status: (record.status || 'published') as 'published' | 'draft' | 'archived',
                createdAt: record.createdAt || record.updatedAt,
            });
        },
        /** 只更新允许修改的字段，保留 ID 和创建时间。 */
        async update(id: string, fields: Partial<DictionaryWrite>): Promise<boolean> {
            const allowed = ['label', 'kind', 'category', 'wordCount', 'sha256', 'fileID', 'cloudPath', 'status', 'updatedAt'];
            const values = Object.fromEntries(
                Object.entries(fields).filter(([key, value]) => allowed.includes(key) && value !== undefined),
            );
            if (!Object.keys(values).length) {
                const rows = await db.select({id: dictionaries.id}).from(dictionaries).where(eq(dictionaries.id, id));
                return rows.length > 0;
            }
            const [result] = await db.update(dictionaries).set(values).where(eq(dictionaries.id, id));
            return result.affectedRows > 0;
        },
    };
}
