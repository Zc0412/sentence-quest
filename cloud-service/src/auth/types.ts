/** 后台鉴权仓储契约，支持真实数据库与接口测试依赖注入。 */
import type { adminUsers, adminSessions, adminInvites } from '../db/schema';

export type AdminUser = typeof adminUsers.$inferSelect;

export type AdminSession = typeof adminSessions.$inferSelect;

export type AdminInvite = typeof adminInvites.$inferSelect;

export type Principal = {
    user: AdminUser;
    session: AdminSession;
};

export class AuthError extends Error {
    constructor(public status: 400 | 401 | 403 | 404 | 409 | 429, message: string) {
        super(message);
    }
}

export interface AuthRepository {
    findUser(username: string): Promise<AdminUser | undefined>;
    authenticate(tokenHash: string): Promise<Principal | undefined>;
    register(user: AdminUser, codeHash: string): Promise<void>;
    login(user: AdminUser, session: AdminSession): Promise<void>;
    logout(sessionId: string): Promise<void>;
    changePassword(userId: string, oldHash: string, newHash: string): Promise<void>;
    createInvite(invite: AdminInvite): Promise<void>;
    revokeInvite(id: string): Promise<void>;
    listUsers(): Promise<AdminUser[]>;
    setStatus(actorId: string, targetId: string, status: 'active' | 'disabled'): Promise<void>;
    consumeLimit(key: string, maximum: number): Promise<boolean>;
}

export interface AuthConfig {
    sessionDays: number;
    secureCookie: boolean;
    allowedOrigins: string[];
}

export function readAuthConfig(env = process.env): AuthConfig {
    const sessionDays = Number(env.ADMIN_SESSION_DAYS || 7);
    if (!Number.isInteger(sessionDays) || sessionDays < 1 || sessionDays > 30) {
        throw new Error('ADMIN_SESSION_DAYS 必须为 1–30');
    }
    const allowedOrigins = (env.ADMIN_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
    for (const origin of allowedOrigins) {
        if (new URL(origin).origin !== origin || !/^https?:\/\//.test(origin)) {
            throw new Error('ADMIN_ALLOWED_ORIGINS 必须是完整 HTTP(S) origin，不能包含路径');
        }
    }
    return {
        sessionDays,
        secureCookie: env.NODE_ENV === 'production',
        allowedOrigins
    };
}

/** 明确列出可公开字段，避免密码哈希随对象展开泄漏。 */
export function publicUser(user: AdminUser) {
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
