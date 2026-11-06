/** 定义云服务 HTTP 请求和响应的共享 Zod schema。 */
import {z} from '@hono/zod-openapi';

export const DictionaryIdSchema = z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/)
    .openapi({
        param: {name: 'id', in: 'path'},
        description: '题库 ID',
        example: 'cet4',
    });

export const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.array(z.string()).optional(),
}).openapi('ErrorResponse');

export const HealthResponseSchema = z.object({
    ok: z.boolean(),
}).openapi('HealthResponse');

export const DictionarySchema = z.object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(['word', 'phrase']),
    category: z.string(),
    wordCount: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).openapi('Dictionary');

export const DictionaryResponseSchema = z.object({
    dictionary: DictionarySchema,
}).openapi('DictionaryResponse');

export const DictionaryListResponseSchema = z.object({
    dictionaries: z.array(DictionarySchema),
}).openapi('DictionaryListResponse');

export const DictionaryContentResponseSchema = z.object({
    items: z.array(z.unknown()),
    next: z.number().int().nonnegative().nullable(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).openapi('DictionaryContentResponse');

export const SuccessResponseSchema = z.object({
    ok: z.boolean(),
}).openapi('SuccessResponse');

export const JsonErrorResponse = {
    content: {
        'application/json': {
            schema: ErrorResponseSchema,
        },
    },
};

export const ServerErrorResponse = {
    description: '服务暂不可用',
    ...JsonErrorResponse,
};

/** 格式化 Zod 校验错误，避免请求校验失败时泄露内部异常。 */
export function zodValidationErrorHandler(result: {success: boolean; error?: {issues: {path: PropertyKey[]; message: string}[]}}, c: {
    json: (body: {error: string; details?: string[]}, status: 400) => Response;
}) {
    if (result.success) {
        return undefined;
    }

    return c.json({
        error: '请求参数无效',
        details: result.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    }, 400);
}
