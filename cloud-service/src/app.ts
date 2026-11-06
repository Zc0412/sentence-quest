/** 组装 OpenAPI 路由、Swagger 文档、健康检查及统一错误处理。 */
import {OpenAPIHono, createRoute} from '@hono/zod-openapi';
import {HTTPException} from 'hono/http-exception';
import type {Services} from './types/services';
import {createRoutes as pronunciationRoutes} from './routes/pronunciation';
import {createRoutes as dictionaryRoutes} from './routes/dictionaries';
import {createRoutes as adminRoutes} from './routes/admin';
import {swaggerUI} from '@hono/swagger-ui';
import {HealthResponseSchema, ServerErrorResponse} from './schemas/http';

const healthRoute = createRoute({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: '健康检查',
    responses: {
        200: {
            description: '进程可响应',
            content: {'application/json': {schema: HealthResponseSchema}},
        },
        500: ServerErrorResponse,
    },
});

/** 创建 Hono 应用，业务实现通过依赖注入供路由调用。 */
export function createApp(services: Services) {
    const app = new OpenAPIHono();
    app.openAPIRegistry.registerComponent('securitySchemes', 'AdminBearerAuth', {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Admin token',
        description: '填写云托管环境变量 DICTIONARY_ADMIN_TOKEN 的值，不要在公开环境中分享。',
    });
    // 返回进程健康状态，供容器探测。
    app.openapi(healthRoute, (c) => c.json({ok: true}, 200));
    app.get('/swagger', swaggerUI({url: '/openapi.json'}));
    app.route('/', pronunciationRoutes(services));
    app.route('/', dictionaryRoutes(services));
    app.route('/', adminRoutes(services));
    // 根据已注册路由和请求 Zod schema 生成 OpenAPI 文档。
    app.doc('/openapi.json', {
        openapi: '3.0.0',
        info: {
            title: 'SentLeap Cloud Service API',
            version: '1.0.0',
            description: 'SentLeap 发音和云端题库接口。管理员写接口使用 Bearer 管理令牌。',
        },
        servers: [{url: '/'}],
    });
    // 对外隐藏数据库和云存储错误细节。
    app.onError((error, c) => {
        if (error instanceof HTTPException) {
            const message = error.status === 400 ? '请求格式无效' : '请求无法处理';
            return c.json({error: message}, error.status);
        }
        console.error('云托管接口失败:', error);
        return c.json({error: '服务暂不可用'}, 500);
    });
    return app;
}
