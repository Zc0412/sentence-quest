/** 全局后台访问控制：公开登录/注册，其余后台接口必须持有有效数据库会话。 */
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { hashToken } from '../auth/crypto';
import type { AuthConfig, AuthRepository, Principal } from '../auth/types';

export const SESSION_COOKIE = 'sentleap_admin';

export type AuthEnv = {
    Variables: {
        principal: Principal;
    };
};

export const authSecurity: Record<string, string[]>[] = [{ AdminBearer: [] }, { AdminCookie: [] }];

export function adminAuth(repository?: AuthRepository, config?: AuthConfig): MiddlewareHandler<AuthEnv> {
    return async (c, next) => {
        c.header('Cache-Control', 'no-store');
        const path = c.req.path;
        const publicEndpoint = c.req.method === 'POST'
            && ['/api/admin/auth/login', '/api/admin/auth/register'].includes(path);
        const authorization = c.req.header('Authorization');
        const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
        const token = bearer || getCookie(c, SESSION_COOKIE);
        // 登录也检查浏览器来源，阻止 login CSRF；不信任转发 Host / Origin 作为白名单。
        const origin = c.req.header('Origin');
        const safe = ['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);
        const allowed = config?.allowedOrigins || [];
        const invalidSource = !safe && (origin ? !allowed.includes(origin) : (!bearer && !publicEndpoint));
        if (publicEndpoint && invalidSource) {
            return c.json({ error: '请求来源不允许' }, 403);
        }
        if (publicEndpoint) {
            return next();
        }
        if (!repository || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
            return c.json({ error: '请先登录' }, 401);
        }
        const principal = await repository.authenticate(hashToken(token));
        if (!principal) {
            return c.json({ error: '登录已失效，请重新登录' }, 401);
        }
        if (invalidSource) {
            return c.json({ error: '请求来源不允许' }, 403);
        }
        c.set('principal', principal);
        await next();
    };
}
