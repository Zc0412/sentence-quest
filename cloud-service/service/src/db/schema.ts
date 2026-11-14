/** Drizzle 数据库表定义；保持现有题库字段及大小写敏感主键。 */
import { customType, datetime, index, int, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

const dictionaryId = customType<{
    data: string;
}>({
    /** 与原表的 ASCII 二进制排序规则一致，避免不同大小写 ID 冲突。 */
    dataType() { return 'varchar(80) CHARACTER SET ascii COLLATE ascii_bin'; },
});

const sha256Value = customType<{
    data: string;
}>({
    dataType() { return 'char(64) CHARACTER SET ascii'; },
});

export const dictionaries = mysqlTable('dictionaries', {
    id: dictionaryId('id').primaryKey(),
    label: varchar('label', { length: 100 }).notNull(),
    kind: mysqlEnum('kind', ['word', 'phrase']).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    wordCount: int('wordCount', { unsigned: true }).notNull(),
    sha256: sha256Value('sha256').notNull(),
    fileID: text('fileID').notNull(),
    cloudPath: text('cloudPath').notNull(),
    status: mysqlEnum('status', ['published', 'draft', 'archived']).notNull().default('published'),
    createdAt: varchar('createdAt', { length: 24 }).notNull(),
    updatedAt: varchar('updatedAt', { length: 24 }).notNull(),
});

/** 后台账号独立于学习进度；用户名在入口统一为小写。 */
export const adminUsers = mysqlTable('admin_users', {
    id: varchar('id', { length: 36 }).primaryKey(),
    username: varchar('username', { length: 32 }).notNull().unique(),
    passwordHash: varchar('passwordHash', { length: 255 }).notNull(),
    nickname: varchar('nickname', { length: 50 }).notNull(),
    role: mysqlEnum('role', ['super_admin', 'admin']).notNull().default('admin'),
    status: mysqlEnum('status', ['active', 'disabled']).notNull().default('active'),
    lastLoginAt: datetime('lastLoginAt', { fsp: 3 }),
    createdAt: datetime('createdAt', { fsp: 3 }).notNull(),
    updatedAt: datetime('updatedAt', { fsp: 3 }).notNull(),
});

/** 仅保存令牌哈希；原始令牌只交付给登录客户端。 */
export const adminSessions = mysqlTable('admin_sessions', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('userId', { length: 36 }).notNull().references(() => adminUsers.id),
    tokenHash: sha256Value('tokenHash').notNull().unique(),
    expiresAt: datetime('expiresAt', { fsp: 3 }).notNull(),
    revokedAt: datetime('revokedAt', { fsp: 3 }),
    createdAt: datetime('createdAt', { fsp: 3 }).notNull(),
}, (table) => [index('sessions_user_idx').on(table.userId), index('sessions_expiry_idx').on(table.expiresAt)]);

/** 邀请只能注册普通管理员；消耗邀请码与创建账号在同一事务完成。 */
export const adminInvites = mysqlTable('admin_invites', {
    id: varchar('id', { length: 36 }).primaryKey(),
    codeHash: sha256Value('codeHash').notNull().unique(),
    createdBy: varchar('createdBy', { length: 36 }).notNull().references(() => adminUsers.id),
    expiresAt: datetime('expiresAt', { fsp: 3 }).notNull(),
    usedBy: varchar('usedBy', { length: 36 }).references(() => adminUsers.id),
    usedAt: datetime('usedAt', { fsp: 3 }),
    revokedAt: datetime('revokedAt', { fsp: 3 }),
    createdAt: datetime('createdAt', { fsp: 3 }).notNull(),
});

/** 数据库共享限流计数，适用于多个云托管实例；键不保存原始账号或 IP。 */
export const adminAuthLimits = mysqlTable('admin_auth_limits', {
    key: sha256Value('key').primaryKey(),
    attempts: int('attempts', { unsigned: true }).notNull(),
    expiresAt: datetime('expiresAt', { fsp: 3 }).notNull(),
}, (table) => [index('auth_limits_expiry_idx').on(table.expiresAt)]);
