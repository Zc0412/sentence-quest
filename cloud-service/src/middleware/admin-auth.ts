/** 管理接口的令牌验证与访问控制。 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
/** 仅接受部署环境配置的管理员令牌，未配置时关闭所有写入接口。 */
export function isAdmin(authorization: string | undefined, configuredToken: string | undefined): boolean {
    if (!configuredToken || configuredToken.length < 32 || !authorization?.startsWith('Bearer ')) {
        return false;
    }
    const expected = createHash('sha256').update(configuredToken).digest();
    const supplied = createHash('sha256').update(authorization.slice(7)).digest();
    return timingSafeEqual(expected, supplied);
}
/** 创建管理员鉴权中间件，未配置令牌时拒绝写入。 */
export function adminAuth(token?: string): MiddlewareHandler {
    return async (c, next) => {
        if (!isAdmin(c.req.header('Authorization'), token)) {
            return c.json({ error: '无管理权限' }, 401);
        }
        await next();
    };
}
