/** 发音路由：用 Zod 校验请求，并将同一 schema 暴露给 OpenAPI。 */
import {createRoute, OpenAPIHono, z} from '@hono/zod-openapi';
import type {Services} from '../types/services';
import {ServerErrorResponse, zodValidationErrorHandler} from '../schemas/http';

const pronunciationResultSchema = z.object({
    ok: z.boolean(),
    audio: z.string().optional(),
    error: z.string().optional(),
}).openapi('PronunciationResponse');

const pronunciationRoute = createRoute({
    method: 'post',
    path: '/api/pronunciation',
    tags: ['Pronunciation'],
    summary: '获取英语发音音频',
    request: {
        body: {
            required: true,
            content: {
                'application/json': {
                    schema: z.object({
                        word: z.string().optional().openapi({example: 'hello'}),
                        type: z.string().optional().openapi({example: '1', description: '1 为英音，2 为美音'}),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: '发音处理结果',
            content: {'application/json': {schema: pronunciationResultSchema}},
        },
        400: {
            description: '请求内容无效或发音服务不可用',
            content: {'application/json': {schema: pronunciationResultSchema}},
        },
        415: {
            description: '请求体必须使用 application/json',
            content: {'application/json': {schema: z.object({error: z.string()})}},
        },
        500: ServerErrorResponse,
    },
});

export function createRoutes(services: Services) {
    const app = new OpenAPIHono({defaultHook: zodValidationErrorHandler});
    // 沿用原发音接口的参数和 Base64 响应，兼容小程序本地音频缓存。
    app.openapi(pronunciationRoute, async (c) => {
        const body = c.req.valid('json');
        const result = await services.pronounce(body || {});
        return c.json(result, result.ok ? 200 : 400);
    });
    return app;
}
