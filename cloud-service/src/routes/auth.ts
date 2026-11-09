/** 后台账号接口：邀请注册、登录、会话和超级管理员管理；数据来自 MySQL 仓储。 */
import { randomUUID } from 'node:crypto';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { setCookie, deleteCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { getConnInfo } from '@hono/node-server/conninfo';
import { hashPassword, verifyPassword, hashToken, newToken } from '../auth/crypto';
import { AuthError, publicUser, readAuthConfig } from '../auth/types';
import { authSecurity, SESSION_COOKIE, type AuthEnv } from '../middleware/admin-auth';
import { zodValidationErrorHandler } from '../schemas/http';
import type { Services } from '../types/services';

export const UsernameSchema = z.string().trim().min(3).max(32)
    .regex(/^[a-zA-Z0-9_]+$/).transform((value) => value.toLowerCase());

export const PasswordSchema = z.string().min(6).max(128);

const credentials = z.object({ username: UsernameSchema, password: PasswordSchema }).strict();

const registration = credentials.extend({
    nickname: z.string().trim().min(1).max(50),
    inviteCode: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

const jsonBody = <T extends z.ZodType>(schema: T) => ({ required: true, content: { 'application/json': { schema } } });

const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
    role: z.enum(['admin', 'super_admin']),
    status: z.enum(['active', 'disabled']),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

const response = (schema: z.ZodType) => ({ description: '操作成功', content: { 'application/json': { schema } } });

const errorResponse = { description: '请求失败', content: { 'application/json': { schema: z.object({ error: z.string() }) } } };

const errors = {
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
    429: errorResponse,
    413: errorResponse,
    500: errorResponse
};

const ok = z.object({ ok: z.boolean() });

const idParams = z.object({ id: z.string().uuid() });

/** 注册账号路由；仅登录/注册公开，其余接口由全局中间件注入身份。 */
export function createRoutes(services: Services) {
    const app = new OpenAPIHono<AuthEnv>({ defaultHook: zodValidationErrorHandler });
    const config = services.authConfig || readAuthConfig();
    const repository = () => {
        if (!services.auth) {
            throw new Error('管理员账号仓储未配置');
        }
        return services.auth;
    };
    const accountBodyLimit = bodyLimit({
        maxSize: 8192,
        onError: (c) => c.json({ error: '请求体超过 8 KiB' }, 413),
    });
    app.use('/api/admin/auth/*', accountBodyLimit);
    app.use('/api/admin/invites', accountBodyLimit);
    app.use('/api/admin/users/*', accountBodyLimit);

    /** 只采用 TCP 来源，不信任客户端可伪造的 X-Forwarded-For；网关后采用保守共享桶。 */
    async function rateLimit(c: Parameters<typeof getConnInfo>[0], account: string, action: string) {
        let source = 'gateway';
        try {
            source = getConnInfo(c).remote.address || source;
        }
        catch {
            // 无原生连接信息的测试/适配环境使用共享来源桶。
        }
        const repo = repository();
        const sourceAllowed = await repo.consumeLimit(hashToken(`${action}:source:${source}`), 100);
        if (!sourceAllowed) {
            throw new AuthError(429, '操作过于频繁，请在 15 分钟后重试');
        }
        const accountAllowed = await repo.consumeLimit(hashToken(`${action}:account:${account}`), 10);
        if (!accountAllowed) {
            throw new AuthError(429, '操作过于频繁，请在 15 分钟后重试');
        }
    }
    app.openapi(createRoute({
        method: 'post',
        path: '/api/admin/auth/register',
        tags: ['Auth'],
        summary: '使用一次性邀请注册普通管理员',
        request: { body: jsonBody(registration) },
        responses: { 201: response(z.object({ user: userSchema })), ...errors },
    }), async (c) => {
        const input = c.req.valid('json');
        await rateLimit(c, input.username, 'register');
        const now = new Date();
        const user = {
            id: randomUUID(),
            username: input.username,
            nickname: input.nickname,
            passwordHash: await hashPassword(input.password),
            role: 'admin' as const,
            status: 'active' as const,
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now,
        };
        await repository().register(user, hashToken(input.inviteCode));
        return c.json({ user: publicUser(user) }, 201);
    });
    app.openapi(createRoute({
        method: 'post',
        path: '/api/admin/auth/login',
        tags: ['Auth'],
        summary: '登录并设置会话 Cookie，同时返回 Swagger 可用的 Bearer 令牌',
        request: { body: jsonBody(credentials) },
        responses: {
            200: response(z.object({
                user: userSchema,
                token: z.string(),
                expiresAt: z.string()
            })),
            ...errors
        },
    }), async (c) => {
        const input = c.req.valid('json');
        await rateLimit(c, input.username, 'login');
        const user = await repository().findUser(input.username);
        const valid = await verifyPassword(input.password, user?.passwordHash);
        if (!valid || !user || user.status !== 'active') {
            throw new AuthError(401, '用户名或密码错误');
        }
        const token = newToken();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + config.sessionDays * 86400000);
        await repository().login(user, {
            id: randomUUID(),
            userId: user.id,
            tokenHash: hashToken(token),
            createdAt: now,
            expiresAt,
            revokedAt: null
        });
        setCookie(c, SESSION_COOKIE, token, {
            httpOnly: true,
            secure: config.secureCookie,
            sameSite: 'Lax',
            path: '/api/admin',
            maxAge: config.sessionDays * 86400
        });
        return c.json({
            user: publicUser({ ...user, lastLoginAt: now }),
            token,
            expiresAt: expiresAt.toISOString()
        }, 200);
    });
    app.openapi(createRoute({
        method: 'get',
        path: '/api/admin/auth/me',
        tags: ['Auth'],
        security: authSecurity,
        summary: '当前账号',
        responses: { 200: response(z.object({ user: userSchema })), ...errors },
    }), async (c) => c.json({ user: publicUser(c.get('principal').user) }, 200));
    app.openapi(createRoute({
        method: 'post',
        path: '/api/admin/auth/logout',
        tags: ['Auth'],
        security: authSecurity,
        summary: '撤销当前会话',
        responses: { 200: response(ok), ...errors },
    }), async (c) => {
        await repository().logout(c.get('principal').session.id);
        deleteCookie(c, SESSION_COOKIE, { path: '/api/admin', secure: config.secureCookie });
        return c.json({ ok: true }, 200);
    });
    app.openapi(createRoute({
        method: 'put',
        path: '/api/admin/auth/password',
        tags: ['Auth'],
        security: authSecurity,
        summary: '修改密码并撤销全部会话',
        request: { body: jsonBody(z.object({ oldPassword: PasswordSchema, newPassword: PasswordSchema }).strict()) },
        responses: { 200: response(ok), ...errors },
    }), async (c) => {
        const input = c.req.valid('json');
        const { user } = c.get('principal');
        await rateLimit(c, user.id, 'password');
        if (!await verifyPassword(input.oldPassword, user.passwordHash)) {
            throw new AuthError(400, '旧密码错误');
        }
        await repository().changePassword(user.id, user.passwordHash, await hashPassword(input.newPassword));
        deleteCookie(c, SESSION_COOKIE, { path: '/api/admin', secure: config.secureCookie });
        return c.json({ ok: true }, 200);
    });
    // 普通管理员不能创建邀请或管理其他账号。
    app.use('/api/admin/invites*', async (c, next) => {
        if (c.get('principal').user.role !== 'super_admin') {
            throw new AuthError(403, '需要超级管理员权限');
        }
        await next();
    });
    app.use('/api/admin/users*', async (c, next) => {
        if (c.get('principal').user.role !== 'super_admin') {
            throw new AuthError(403, '需要超级管理员权限');
        }
        await next();
    });
    app.openapi(createRoute({
        method: 'post',
        path: '/api/admin/invites',
        tags: ['Auth'],
        security: authSecurity,
        summary: '创建邀请；邀请码仅返回一次',
        request: { body: jsonBody(z.object({ expiresInHours: z.number().int().min(1).max(168).default(24) }).strict()) },
        responses: {
            201: response(z.object({
                id: z.string(),
                inviteCode: z.string(),
                expiresAt: z.string()
            })),
            ...errors
        },
    }), async (c) => {
        const code = newToken();
        const now = new Date();
        const id = randomUUID();
        const expiresAt = new Date(now.getTime() + c.req.valid('json').expiresInHours * 3600000);
        await repository().createInvite({
            id,
            codeHash: hashToken(code),
            createdBy: c.get('principal').user.id,
            createdAt: now,
            expiresAt,
            usedAt: null,
            usedBy: null,
            revokedAt: null
        });
        return c.json({
            id,
            inviteCode: code,
            expiresAt: expiresAt.toISOString()
        }, 201);
    });
    app.openapi(createRoute({
        method: 'delete',
        path: '/api/admin/invites/{id}',
        tags: ['Auth'],
        security: authSecurity,
        summary: '撤销未使用邀请',
        request: { params: idParams },
        responses: { 200: response(ok), ...errors },
    }), async (c) => {
        await repository().revokeInvite(c.req.valid('param').id);
        return c.json({ ok: true }, 200);
    });
    app.openapi(createRoute({
        method: 'get',
        path: '/api/admin/users',
        tags: ['Auth'],
        security: authSecurity,
        summary: '管理员列表',
        responses: { 200: response(z.object({ users: z.array(userSchema) })), ...errors },
    }), async (c) => c.json({ users: (await repository().listUsers()).map(publicUser) }, 200));
    app.openapi(createRoute({
        method: 'patch',
        path: '/api/admin/users/{id}/status',
        tags: ['Auth'],
        security: authSecurity,
        summary: '禁用或恢复账号',
        request: { params: idParams, body: jsonBody(z.object({ status: z.enum(['active', 'disabled']) }).strict()) },
        responses: { 200: response(ok), ...errors },
    }), async (c) => {
        await repository().setStatus(c.get('principal').user.id, c.req.valid('param').id, c.req.valid('json').status);
        return c.json({ ok: true }, 200);
    });
    return app;
}
