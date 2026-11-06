/** pronunciation 路由：处理对应 HTTP 请求与响应。 */
import { Hono } from 'hono';
import type { Services, Dictionary } from '../types/services';
/** 创建路由并注入后端服务依赖。 */
export function createRoutes(services: Services) {
    const app = new Hono();
    // 沿用原发音接口的参数和 Base64 响应，兼容小程序本地音频缓存。
    app.post('/api/pronunciation', async (c) => {
        let body: {
            word?: unknown;
            type?: string;
        };
        try {
            body = await c.req.json();
        }
        catch {
            return c.json({ ok: false, error: '请求格式无效' }, 400);
        }
        const result = await services.pronounce(body || {});
        return c.json(result, result.ok ? 200 : 400);
    });
    return app;
}
