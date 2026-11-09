/** 后台账号仓储：邀请注册、会话撤销及共享限流均在 MySQL 中执行。 */
import type { Pool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { adminUsers as users, adminSessions as sessions, adminInvites as invites, adminAuthLimits as limits } from '../db/schema';
import { AuthError, type AuthRepository } from '../auth/types';

export function createAdminRepository(pool: Pool): AuthRepository {
    const db = drizzle(pool);
    return {
        async findUser(username) {
            return (await db.select().from(users).where(eq(users.username, username)))[0];
        },
        async authenticate(tokenHash) {
            const rows = await db.select({ user: users, session: sessions }).from(sessions)
                .innerJoin(users, eq(users.id, sessions.userId))
                .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()), eq(users.status, 'active')));
            return rows[0];
        },
        async register(user, codeHash) {
            await db.transaction(async (tx) => {
                const [invite] = await tx.select().from(invites).where(eq(invites.codeHash, codeHash)).for('update');
                if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt <= new Date()) {
                    throw new AuthError(400, '邀请码无效或已失效');
                }
                try {
                    await tx.insert(users).values(user);
                }
                catch (error) {
                    // Drizzle 包装驱动异常；只把唯一键冲突转换为业务错误。
                    const cause = (error as {
                        cause?: {
                            code?: string;
                        };
                    }).cause || error as {
                        code?: string;
                    };
                    if (cause.code === 'ER_DUP_ENTRY') {
                        throw new AuthError(409, '用户名已存在');
                    }
                    throw error;
                }
                await tx.update(invites).set({ usedBy: user.id, usedAt: new Date() }).where(eq(invites.id, invite.id));
            });
        },
        async login(user, session) {
            await db.transaction(async (tx) => {
                const [current] = await tx.select().from(users).where(eq(users.id, user.id)).for('update');
                if (!current || current.status !== 'active' || current.passwordHash !== user.passwordHash) {
                    throw new AuthError(401, '用户名或密码错误');
                }
                await tx.insert(sessions).values(session);
                await tx.update(users).set({ lastLoginAt: session.createdAt }).where(eq(users.id, user.id));
            });
        },
        async logout(id) {
            await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id));
        },
        async changePassword(id, oldHash, newHash) {
            await db.transaction(async (tx) => {
                const [user] = await tx.select().from(users).where(eq(users.id, id)).for('update');
                if (!user || user.status !== 'active' || user.passwordHash !== oldHash) {
                    throw new AuthError(401, '账号状态已变化，请重新登录');
                }
                const now = new Date();
                await tx.update(users).set({ passwordHash: newHash, updatedAt: now }).where(eq(users.id, id));
                await tx.update(sessions).set({ revokedAt: now }).where(eq(sessions.userId, id));
            });
        },
        async createInvite(invite) {
            await db.insert(invites).values(invite);
        },
        async revokeInvite(id) {
            const [result] = await db.update(invites).set({ revokedAt: new Date() })
                .where(and(eq(invites.id, id), isNull(invites.usedAt), isNull(invites.revokedAt)));
            if (!result.affectedRows) {
                throw new AuthError(404, '邀请不存在或已使用、撤销');
            }
        },
        async listUsers() {
            return db.select().from(users).orderBy(users.createdAt);
        },
        async setStatus(actorId, targetId, status) {
            await db.transaction(async (tx) => {
                // 管理员数量较小，统一按主键锁定账号，串行化并发禁用与最后管理员检查。
                const all = await tx.select().from(users).orderBy(users.id).for('update');
                const actor = all.find((user) => user.id === actorId);
                const target = all.find((user) => user.id === targetId);
                if (actor?.role !== 'super_admin' || actor.status !== 'active') {
                    throw new AuthError(403, '无管理权限');
                }
                if (!target) {
                    throw new AuthError(404, '账号不存在');
                }
                if (status === 'disabled' && (actorId === targetId || (target.role === 'super_admin'
                    && all.filter((user) => user.role === 'super_admin' && user.status === 'active').length <= 1))) {
                    throw new AuthError(409, '不能禁用自身或最后一个有效超级管理员');
                }
                const now = new Date();
                await tx.update(users).set({ status, updatedAt: now }).where(eq(users.id, targetId));
                if (status === 'disabled') {
                    await tx.update(sessions).set({ revokedAt: now }).where(eq(sessions.userId, targetId));
                }
            });
        },
        async consumeLimit(key, maximum) {
            return db.transaction(async (tx) => {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
                await tx.insert(limits).values({
                    key,
                    attempts: 1,
                    expiresAt
                }).onDuplicateKeyUpdate({
                    set: {
                        attempts: sql`IF(${limits.expiresAt} <= ${now}, 1, ${limits.attempts} + 1)`,
                        expiresAt: sql`IF(${limits.expiresAt} <= ${now}, ${expiresAt}, ${limits.expiresAt})`,
                    }
                });
                const [row] = await tx.select().from(limits).where(eq(limits.key, key)).for('update');
                return row.attempts <= maximum;
            });
        },
    };
}
