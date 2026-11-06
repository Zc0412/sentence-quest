/** Drizzle 数据库表定义；保持现有题库字段及大小写敏感主键。 */
import {customType, int, mysqlEnum, mysqlTable, text, varchar} from 'drizzle-orm/mysql-core';

const dictionaryId = customType<{data: string}>({
    /** 与原表的 ASCII 二进制排序规则一致，避免不同大小写 ID 冲突。 */
    dataType() { return 'varchar(80) CHARACTER SET ascii COLLATE ascii_bin'; },
});

const sha256Value = customType<{data: string}>({
    dataType() { return 'char(64) CHARACTER SET ascii'; },
});

export const dictionaries = mysqlTable('dictionaries', {
    id: dictionaryId('id').primaryKey(),
    label: varchar('label', {length: 100}).notNull(),
    kind: mysqlEnum('kind', ['word', 'phrase']).notNull(),
    category: varchar('category', {length: 100}).notNull(),
    wordCount: int('wordCount', {unsigned: true}).notNull(),
    sha256: sha256Value('sha256').notNull(),
    fileID: text('fileID').notNull(),
    cloudPath: text('cloudPath').notNull(),
    status: mysqlEnum('status', ['published', 'draft', 'archived']).notNull().default('published'),
    createdAt: varchar('createdAt', {length: 24}).notNull(),
    updatedAt: varchar('updatedAt', {length: 24}).notNull(),
});
