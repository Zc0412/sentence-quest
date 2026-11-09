/** 组装 OpenAPI 路由、Swagger 文档、健康检查及统一错误处理。 */
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { Services } from './types/services';
import { createRoutes as pronunciationRoutes } from './routes/pronunciation';
import { createRoutes as dictionaryRoutes } from './routes/dictionaries';
import { createRoutes as adminRoutes } from './routes/admin';
import { createRoutes as imageRoutes } from './routes/images';
import { createRoutes as authRoutes } from './routes/auth';
import { adminAuth } from './middleware/admin-auth';
import { AuthError, readAuthConfig } from './auth/types';
import { swaggerUI } from '@hono/swagger-ui';
import { HealthResponseSchema, ServerErrorResponse } from './schemas/http';

const healthRoute = createRoute({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: '健康检查',
    responses: {
        200: {
            description: '进程可响应',
            content: { 'application/json': { schema: HealthResponseSchema } },
        },
        500: ServerErrorResponse,
    },
});

/** 创建 Hono 应用，业务实现通过依赖注入供路由调用。 */
export function createApp(services: Services) {
    const app = new OpenAPIHono();
    // 返回进程健康状态，供容器探测。
    app.openapi(healthRoute, (c) => c.json({ ok: true }, 200));
    app.get('/swagger', swaggerUI({ url: '/openapi.json' }));
    app.use('/api/admin/*', adminAuth(services.auth, services.authConfig || readAuthConfig()));
    app.route('/', authRoutes(services));
    app.openAPIRegistry.registerComponent('securitySchemes', 'AdminBearer', { type: 'http', scheme: 'bearer' });
    app.openAPIRegistry.registerComponent('securitySchemes', 'AdminCookie', {
        type: 'apiKey',
        in: 'cookie',
        name: 'sentleap_admin'
    });
    app.route('/', pronunciationRoutes(services));
    app.route('/', dictionaryRoutes(services));
    app.route('/', adminRoutes(services));
    app.route('/', imageRoutes(services));
    // 根据已注册路由和请求 Zod schema 生成 OpenAPI 文档。
    app.doc('/openapi.json', {
        openapi: '3.0.0',
        info: {
            title: 'SentLeap Cloud Service API',
            version: '1.0.0',
            description: 'SentLeap 发音和云端题库接口。管理员接口需要登录，注册需要邀请码。',
        },
        servers: [{ url: '/' }],
    });
    // 对外隐藏数据库和云存储错误细节。
    app.onError((error, c) => {
        if (error instanceof AuthError) {
            if (error.status === 429) {
                c.header('Retry-After', '900');
            }
            return c.json({ error: error.message }, error.status);
        }
        if (error instanceof HTTPException) {
            const message = error.status === 400 ? '请求格式无效' : '请求无法处理';
            return c.json({ error: message }, error.status);
        }
        console.error('云托管接口失败:', error);
        return c.json({ error: '服务暂不可用' }, 500);
    });
    return app;
}
