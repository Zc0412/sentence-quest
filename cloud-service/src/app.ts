/** 组装路由、健康检查及统一错误处理。 */
import {Hono} from 'hono';
import type {Services} from './types/services';
import {createRoutes as pronunciationRoutes} from './routes/pronunciation';
import {createRoutes as dictionaryRoutes} from './routes/dictionaries';
import {createRoutes as adminRoutes} from './routes/admin';
import {swaggerUI} from '@hono/swagger-ui';
import {openApiDocument} from './openapi';

/** 创建 Hono 应用，业务实现通过依赖注入供路由调用。 */
export function createApp(services: Services) {
    const app = new Hono();
    // 返回进程健康状态，供容器探测。
    app.get('/health', (c) => c.json({ok: true}));
    // 为接口文档提供机器可读 OpenAPI JSON 和 Swagger UI。
    app.get('/openapi.json', (c) => c.json(openApiDocument));
    app.get('/swagger', swaggerUI({url: '/openapi.json'}));
    app.route('/', pronunciationRoutes(services));
    app.route('/', dictionaryRoutes(services));
    app.route('/', adminRoutes(services));
    // 对外隐藏数据库和云存储错误细节。
    app.onError((error, c) => {
        console.error('云托管接口失败:', error);
        return c.json({error: '服务暂不可用'}, 500);
    });
    return app;
}
