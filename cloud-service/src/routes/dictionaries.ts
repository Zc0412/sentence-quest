/** 题库读取路由：用 Zod 校验路径和分页参数，并生成 OpenAPI 文档。 */
import {createRoute, OpenAPIHono, z} from '@hono/zod-openapi';
import type {Services} from '../types/services';
import {DictionaryIdSchema, DictionaryContentResponseSchema, DictionaryListResponseSchema, DictionaryResponseSchema, JsonErrorResponse, ServerErrorResponse, zodValidationErrorHandler} from '../schemas/http';
import {visible, publicMetadata} from '../utils/dictionary';

const dictionaryParamsSchema = z.object({
    id: DictionaryIdSchema,
});

const dictionaryContentQuerySchema = z.object({
    offset: z.string()
        .regex(/^\d*$/)
        .optional()
        .openapi({description: '从题库中的第几条开始读取', example: '0'})
        .transform((value) => Number(value || 0))
        .pipe(z.number().int().safe().nonnegative()),
    version: z.string().optional().openapi({
        description: '目录返回的 SHA-256 版本标识，用于检测题库更新',
    }),
});

const listDictionariesRoute = createRoute({
    method: 'get',
    path: '/api/dictionaries',
    tags: ['Dictionaries'],
    summary: '获取已发布题库目录',
    responses: {
        200: {
            description: '公开题库目录',
            content: {'application/json': {schema: DictionaryListResponseSchema}},
        },
        500: ServerErrorResponse,
    },
});

const getDictionaryRoute = createRoute({
    method: 'get',
    path: '/api/dictionaries/{id}',
    tags: ['Dictionaries'],
    summary: '获取题库公开资料',
    request: {params: dictionaryParamsSchema},
    responses: {
        200: {
            description: '题库资料',
            content: {'application/json': {schema: DictionaryResponseSchema}},
        },
        400: {...JsonErrorResponse, description: '题库 ID 无效'},
        404: {...JsonErrorResponse, description: '题库不存在或不可见'},
        500: ServerErrorResponse,
    },
});

const getDictionaryContentRoute = createRoute({
    method: 'get',
    path: '/api/dictionaries/{id}/content',
    tags: ['Dictionaries'],
    summary: '分页获取已发布题库内容',
    request: {
        params: dictionaryParamsSchema,
        query: dictionaryContentQuerySchema,
    },
    responses: {
        200: {
            description: '题库内容分页；next 为 null 时表示结束',
            content: {'application/json': {schema: DictionaryContentResponseSchema}},
        },
        400: {...JsonErrorResponse, description: '题库 ID 或分页参数无效'},
        404: {...JsonErrorResponse, description: '题库不存在或不可见'},
        409: {...JsonErrorResponse, description: '题库已更新，需要刷新目录'},
        413: {...JsonErrorResponse, description: '单条题目超过响应大小限制'},
        500: ServerErrorResponse,
    },
});

/** 创建题库公开读取路由，并保留分页和发布状态检查。 */
export function createRoutes(services: Services) {
    const app = new OpenAPIHono({defaultHook: zodValidationErrorHandler});

    app.openapi(listDictionariesRoute, async (c) => {
        const rows = await services.list();
        return c.json({dictionaries: rows.filter(visible).map(publicMetadata)}, 200);
    });

    app.openapi(getDictionaryRoute, async (c) => {
        const {id} = c.req.valid('param');
        const row = await services.get(id);
        if (!row || !visible(row)) {
            return c.json({error: '题库不存在'}, 404);
        }
        return c.json({dictionary: publicMetadata(row)}, 200);
    });

    app.openapi(getDictionaryContentRoute, async (c) => {
        const {id} = c.req.valid('param');
        const {offset, version} = c.req.valid('query');
        const row = await services.get(id);
        if (!row || !visible(row) || !row.fileID?.startsWith('cloud://')) {
            return c.json({error: '题库不存在'}, 404);
        }
        if (version && version !== row.sha256) {
            return c.json({error: '题库已更新，请刷新目录'}, 409);
        }
        const bytes = await services.download(row.fileID);
        const rows = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
        if (!Array.isArray(rows) || offset > rows.length) {
            throw new Error('题库文件格式无效');
        }
        // 限制每页 JSON 字节数，避免超过小程序云托管响应大小。
        const items: unknown[] = [];
        let size = 0;
        let index = offset;
        while (index < rows.length) {
            const itemSize = Buffer.byteLength(JSON.stringify(rows[index]), 'utf8') + 1;
            if (itemSize > 240 * 1024) {
                return c.json({error: '单条题目过大'}, 413);
            }
            if (size + itemSize > 240 * 1024) {
                break;
            }
            items.push(rows[index++]);
            size += itemSize;
        }
        return c.json({items, next: index < rows.length ? index : null, sha256: row.sha256}, 200);
    });

    return app;
}
