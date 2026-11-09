/** 管理员题库路由：用 Zod 校验输入并为 Swagger 生成接口文档。 */
import { authSecurity } from '../middleware/admin-auth';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import type { Services, Dictionary } from '../types/services';
import { InputError, prepareDictionary, CreateDictionarySchema, UpdateDictionarySchema } from '../schemas/dictionary';
import type { DictionaryWrite } from '../schemas/dictionary';
import { DictionaryIdSchema, DictionaryResponseSchema, JsonErrorResponse, ServerErrorResponse, SuccessResponseSchema, zodValidationErrorHandler } from '../schemas/http';
import { publicMetadata } from '../utils/dictionary';

const dictionaryParamsSchema = z.object({
    id: DictionaryIdSchema,
});

const createDictionaryRoute = createRoute({
    method: 'post',
    path: '/api/admin/dictionaries',
    tags: ['Admin'],
    security: authSecurity,
    summary: '上传并创建题库',
    description: '上传题库 JSON 并登记到数据库；此接口需要管理员登录。请求体最大 5 MiB。',
    request: {
        body: {
            required: true,
            content: { 'application/json': { schema: CreateDictionarySchema } },
        },
    },
    responses: {
        401: { ...JsonErrorResponse, description: '请先登录或会话已失效' },
        403: { ...JsonErrorResponse, description: '无权限或请求来源不允许' },
        400: { ...JsonErrorResponse, description: '请求内容无效' },
        201: {
            description: '题库已上传并登记',
            content: { 'application/json': { schema: DictionaryResponseSchema } },
        },
        409: { ...JsonErrorResponse, description: '题库 ID 已存在' },
        413: { ...JsonErrorResponse, description: '请求体超过 5 MiB' },
        415: { ...JsonErrorResponse, description: '请求体必须使用 application/json' },
        500: ServerErrorResponse,
    },
});

const uploadDictionaryFileRoute = createRoute({
    method: 'post',
    path: '/api/admin/upload-dictionary',
    tags: ['Admin'],
    security: authSecurity,
    summary: '通过 JSON 文件上传题库',
    description: '选择本地 JSON 文件并填写题库资料；此接口需要管理员登录。',
    request: {
        body: {
            required: true,
            content: {
                'multipart/form-data': {
                    schema: z.object({
                        id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/),
                        label: z.string().min(1).max(100),
                        kind: z.enum(['word', 'phrase']),
                        category: z.string().max(100).optional(),
                        status: z.enum(['published', 'draft', 'archived']).optional(),
                        file: z.file().openapi({
                            type: 'string',
                            format: 'binary',
                            description: 'JSON 文件内容为题库条目数组',
                        }),
                    }).openapi('UploadDictionaryFileRequest'),
                },
            },
        },
    },
    responses: {
        401: { ...JsonErrorResponse, description: '请先登录或会话已失效' },
        403: { ...JsonErrorResponse, description: '无权限或请求来源不允许' },
        201: {
            description: '题库已上传并登记',
            content: { 'application/json': { schema: DictionaryResponseSchema } },
        },
        400: { ...JsonErrorResponse, description: 'JSON 文件格式或题库内容无效' },
        409: { ...JsonErrorResponse, description: '题库 ID 已存在' },
        413: { ...JsonErrorResponse, description: '请求体超过 5 MiB' },
        500: ServerErrorResponse,
    },
});

const updateDictionaryRoute = createRoute({
    method: 'put',
    path: '/api/admin/dictionaries/{id}',
    tags: ['Admin'],
    security: authSecurity,
    summary: '更新题库资料',
    description: '只能更新元数据；提交 entries 替换题库 JSON 的操作暂时禁用。题库 ID 和类型不可修改。',
    request: {
        params: dictionaryParamsSchema,
        body: {
            required: true,
            content: { 'application/json': { schema: UpdateDictionarySchema } },
        },
    },
    responses: {
        401: { ...JsonErrorResponse, description: '请先登录或会话已失效' },
        403: { ...JsonErrorResponse, description: '无权限或请求来源不允许' },
        200: {
            description: '题库已更新',
            content: { 'application/json': { schema: DictionaryResponseSchema } },
        },
        400: { ...JsonErrorResponse, description: '请求内容无效' },
        404: { ...JsonErrorResponse, description: '题库不存在' },
        413: { ...JsonErrorResponse, description: '请求体超过 5 MiB' },
        415: { ...JsonErrorResponse, description: '请求体必须使用 application/json' },
        500: ServerErrorResponse,
    },
});

const archiveDictionaryRoute = createRoute({
    method: 'delete',
    path: '/api/admin/dictionaries/{id}',
    tags: ['Admin'],
    security: authSecurity,
    summary: '下架题库',
    description: '将题库状态改为 archived，不删除数据库记录或云文件。',
    request: { params: dictionaryParamsSchema },
    responses: {
        401: { ...JsonErrorResponse, description: '请先登录或会话已失效' },
        403: { ...JsonErrorResponse, description: '无权限或请求来源不允许' },
        200: {
            description: '题库已下架',
            content: { 'application/json': { schema: SuccessResponseSchema } },
        },
        400: { ...JsonErrorResponse, description: '题库 ID 无效' },
        404: { ...JsonErrorResponse, description: '题库不存在' },
        500: ServerErrorResponse,
    },
});

class DictionaryConflictError extends Error {
}

/** 上传校验后的 JSON 字节并登记题库元数据。 */
async function saveDictionary(services: Services, input: z.infer<typeof CreateDictionarySchema>): Promise<ReturnType<typeof publicMetadata>> {
    if (await services.get(input.id)) {
        throw new DictionaryConflictError('题库 ID 已存在');
    }
    const plan = prepareDictionary(input);
    if (!plan.bytes || !plan.fields.id || !plan.fields.cloudPath) {
        throw new Error('题库上传数据准备失败');
    }
    if (!services.upload || !services.create) {
        throw new Error('题库上传服务未配置');
    }
    const fileID = await services.upload(plan.fields.cloudPath, plan.bytes);
    const now = new Date().toISOString();
    const record = {
        ...plan.fields,
        fileID,
        createdAt: now,
        updatedAt: now,
    };
    await services.create(record as DictionaryWrite);
    return publicMetadata(record as Dictionary);
}

/** 创建管理员路由；统一由全局中间件鉴权，保留请求体大小限制及失败诊断。 */
export function createRoutes(services: Services) {
    const app = new OpenAPIHono({ defaultHook: zodValidationErrorHandler });
    app.use('/api/admin/*', bodyLimit({
        maxSize: 5 * 1024 * 1024,
        onError: (c) => c.json({ error: '请求体超过 5 MiB' }, 413),
    }));
    app.openapi(createDictionaryRoute, async (c) => {
        const input = c.req.valid('json');
        try {
            return c.json({ dictionary: await saveDictionary(services, input) }, 201);
        }
        catch (error) {
            if (error instanceof DictionaryConflictError) {
                return c.json({ error: error.message }, 409);
            }
            if (error instanceof InputError) {
                return c.json({ error: error.message }, 400);
            }
            throw error;
        }
    });
    app.openapi(uploadDictionaryFileRoute, async (c) => {
        const { file, ...metadata } = c.req.valid('form');
        let entries: unknown;
        try {
            entries = JSON.parse(await file.text());
        }
        catch {
            return c.json({ error: 'JSON 文件格式无效' }, 400);
        }
        const parsed = CreateDictionarySchema.safeParse({ ...metadata, entries });
        if (!parsed.success) {
            return c.json({
                error: '题库内容无效',
                details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
            }, 400);
        }
        try {
            return c.json({ dictionary: await saveDictionary(services, parsed.data) }, 201);
        }
        catch (error) {
            if (error instanceof DictionaryConflictError) {
                return c.json({ error: error.message }, 409);
            }
            if (error instanceof InputError) {
                return c.json({ error: error.message }, 400);
            }
            throw error;
        }
    });
    app.openapi(updateDictionaryRoute, async (c) => {
        const { id } = c.req.valid('param');
        const input = c.req.valid('json');
        try {
            if (input.entries !== undefined) {
                return c.json({ error: '题库 JSON 替换暂时禁用' }, 403);
            }
            const existing = await services.get(id);
            if (!existing) {
                return c.json({ error: '题库不存在' }, 404);
            }
            const plan = prepareDictionary(input, existing);
            if (!await services.update!(id, plan.fields)) {
                return c.json({ error: '题库不存在' }, 404);
            }
            return c.json({ dictionary: publicMetadata({ ...existing, ...plan.fields } as Dictionary) }, 200);
        }
        catch (error) {
            if (error instanceof InputError) {
                return c.json({ error: error.message }, 400);
            }
            throw error;
        }
    });
    app.openapi(archiveDictionaryRoute, async (c) => {
        const { id } = c.req.valid('param');
        if (!await services.get(id)) {
            return c.json({ error: '题库不存在' }, 404);
        }
        if (!await services.update!(id, { status: 'archived', updatedAt: new Date().toISOString() })) {
            return c.json({ error: '题库不存在' }, 404);
        }
        return c.json({ ok: true }, 200);
    });
    return app;
}
