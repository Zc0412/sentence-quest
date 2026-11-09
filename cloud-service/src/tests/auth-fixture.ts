/** 接口测试使用内存账号仓储；生产始终使用 MySQL，不连接真实云数据库。 */
import { randomUUID } from 'node:crypto';
import type { AdminInvite, AdminSession, AdminUser, AuthRepository } from '../auth/types';
import { AuthError } from '../auth/types';
import { hashToken } from '../auth/crypto';

export const testToken = 'a'.repeat(43);

export const testHeaders = { Authorization: `Bearer ${testToken}` };

export function authFixture() {
    const now = new Date();
    const root: AdminUser = {
        id: randomUUID(),
        username: 'root',
        nickname: '管理员',
        passwordHash: '',
        role: 'super_admin',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null
    };
    const users = new Map([[root.id, root]]);
    const sessions = new Map<string, AdminSession>();
    sessions.set(hashToken(testToken), {
        id: randomUUID(),
        userId: root.id,
        tokenHash: hashToken(testToken),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 86400000),
        revokedAt: null
    });
    const invites = new Map<string, AdminInvite>();
    const limits = new Map<string, number>();
    const repo: AuthRepository = {
        async findUser(username) { return [...users.values()].find((user) => user.username === username); },
        async authenticate(hash) {
            const session = sessions.get(hash);
            const user = session && users.get(session.userId);
            return session && !session.revokedAt && session.expiresAt > new Date() && user?.status === 'active'
                ? { user, session } : undefined;
        },
        async register(user, hash) {
            const invite = invites.get(hash);
            if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt <= new Date()) {
                throw new AuthError(400, '邀请码无效或已失效');
            }
            if ([...users.values()].some((item) => item.username === user.username)) {
                throw new AuthError(409, '用户名已存在');
            }
            users.set(user.id, user);
            invite.usedBy = user.id;
            invite.usedAt = new Date();
        },
        async login(user, session) { sessions.set(session.tokenHash, session); user.lastLoginAt = session.createdAt; },
        async logout(id) {
            for (const session of sessions.values()) {
                if (session.id === id) {
                    session.revokedAt = new Date();
                }
            }
        },
        async changePassword(id, oldHash, newHash) {
            const user = users.get(id)!;
            if (user.passwordHash !== oldHash) {
                throw new AuthError(401, '账号状态已变化');
            }
            user.passwordHash = newHash;
            for (const session of sessions.values()) {
                if (session.userId === id) {
                    session.revokedAt = new Date();
                }
            }
        },
        async createInvite(invite) { invites.set(invite.codeHash, invite); },
        async revokeInvite(id) {
            const invite = [...invites.values()].find((item) => item.id === id);
            if (!invite || invite.usedAt || invite.revokedAt) {
                throw new AuthError(404, '邀请不可用');
            }
            invite.revokedAt = new Date();
        },
        async listUsers() { return [...users.values()]; },
        async setStatus(actor, id, status) {
            if (!users.has(id)) {
                throw new AuthError(404, '账号不存在');
            }
            if (actor === id && status === 'disabled') {
                throw new AuthError(409, '不能禁用自身');
            }
            users.get(id)!.status = status;
            if (status === 'disabled') {
                for (const session of sessions.values()) {
                    if (session.userId === id) {
                        session.revokedAt = new Date();
                    }
                }
            }
        },
        async consumeLimit(key, maximum) {
            const count = (limits.get(key) || 0) + 1;
            limits.set(key, count);
            return count <= maximum;
        },
    };
    return {
        repo,
        root,
        users,
        sessions,
        invites,
        limits
    };
}
