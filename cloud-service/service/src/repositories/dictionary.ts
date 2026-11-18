/** 使用 Drizzle ORM 读写题库资料，复用现有 mysql2 连接池。 */
import type { Pool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, count, eq, like, or } from 'drizzle-orm';
import { DictionaryDeleteConflict, type AdminDictionaryQuery } from '../types/services';
import { dictionaries } from '../db/schema';
import type { DictionaryWrite } from '../schemas/dictionary';

/** 创建题库仓储；ORM 自动绑定查询参数。 */
export function createDictionaryRepository(pool: Pool) {
    const db = drizzle(pool);
    return {
        /** SQL 分页筛选，避免后台拉取全部题库；LIKE 中转义通配符。 */
        async listAdmin(query: AdminDictionaryQuery) {
            const escape = (value: string) => value.replace(/[\\%_]/g, '\\$&');
            const search = query.q ? `%${escape(query.q)}%` : undefined;
            const where = and(
                search ? or(like(dictionaries.id, search), like(dictionaries.label, search)) : undefined,
                query.category ? eq(dictionaries.category, query.category) : undefined,
                query.kind ? eq(dictionaries.kind, query.kind) : undefined,
                query.status ? eq(dictionaries.status, query.status) : undefined,
            );
            const [rows, totals] = await Promise.all([
                db
                    .select()
                    .from(dictionaries)
                    .where(where)
                    .orderBy(dictionaries.id)
                    .limit(query.pageSize)
                    .offset((query.page - 1) * query.pageSize),
                db.select({ total: count() }).from(dictionaries).where(where),
            ]);
            return { dictionaries: rows, total: totals[0].total };
        },
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
        /** 持锁删除当前登记的文件，再删除记录；COS 失败回滚，DB 提交失败可按原记录重试。 */
        async remove(id: string, deleteFile: (fileID: string) => Promise<void>): Promise<boolean> {
            return db.transaction(async (tx) => {
                const [row] = await tx
                    .select({ id: dictionaries.id, fileID: dictionaries.fileID })
                    .from(dictionaries)
                    .where(eq(dictionaries.id, id))
                    .for('update');
                if (!row) return false;
                const references = await tx
                    .select({ id: dictionaries.id })
                    .from(dictionaries)
                    .where(eq(dictionaries.fileID, row.fileID))
                    .for('update');
                if (references.some((reference) => reference.id !== id)) {
                    throw new DictionaryDeleteConflict('题库文件仍被其他题库引用，请先处理引用关系');
                }
                await deleteFile(row.fileID);
                await tx.delete(dictionaries).where(eq(dictionaries.id, id));
                return true;
            });
        },
        /** 只更新允许修改的字段，保留 ID 和创建时间。 */
        async update(id: string, fields: Partial<DictionaryWrite>): Promise<boolean> {
            const allowed = [
                'label',
                'kind',
                'category',
                'wordCount',
                'sha256',
                'fileID',
                'cloudPath',
                'status',
                'updatedAt',
            ];
            const values = Object.fromEntries(
                Object.entries(fields).filter(([key, value]) => allowed.includes(key) && value !== undefined),
            );
            if (!Object.keys(values).length) {
                const rows = await db.select({ id: dictionaries.id }).from(dictionaries).where(eq(dictionaries.id, id));
                return rows.length > 0;
            }
            const [result] = await db.update(dictionaries).set(values).where(eq(dictionaries.id, id));
            return result.affectedRows > 0;
        },
    };
}
