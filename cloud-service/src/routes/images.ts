/** 图片上传测试接口：需要管理员登录，校验文件头后写入 COS，不登记题库。 */
import { authSecurity } from '../middleware/admin-auth';
import { randomUUID } from 'node:crypto';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { JsonErrorResponse, ServerErrorResponse, zodValidationErrorHandler } from '../schemas/http';
import type { Services } from '../types/services';

const route = createRoute({
    method: 'post',
    path: '/api/admin/upload-image',
    tags: ['Admin'],
    security: authSecurity,
    summary: '上传测试图片到 COS',
    description: '需要管理员登录。支持 PNG、JPEG，整个 multipart 请求最大 5 MiB。返回文件 ID，不生成公开访问链接，也不登记题库。',
    request: {
        body: {
            required: true,
            content: {
                'multipart/form-data': {
                    schema: z.object({
                        file: z.file().openapi({ type: 'string', format: 'binary' }),
                    }),
                },
            },
        },
    },
    responses: {
        401: { ...JsonErrorResponse, description: '请先登录或会话已失效' },
        403: { ...JsonErrorResponse, description: '无权限或请求来源不允许' },
        201: {
            description: '图片已保存到 COS',
            content: {
                'application/json': {
                    schema: z.object({
                        fileID: z.string(),
                        contentType: z.string(),
                        size: z.number().int(),
                    })
                }
            },
        },
        400: { ...JsonErrorResponse, description: '缺少文件或请求格式错误' },
        413: { ...JsonErrorResponse, description: '请求体超过 5 MiB' },
        415: { ...JsonErrorResponse, description: '仅支持 PNG、JPEG 文件头' },
        500: ServerErrorResponse,
    },
});

/** 仅识别 PNG/JPEG 文件签名，不解码图像；不信任客户端文件名和 MIME。 */
function imageType(bytes: Buffer) {
    if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
        return { extension: 'png', contentType: 'image/png' };
    }
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return { extension: 'jpg', contentType: 'image/jpeg' };
    }
    return undefined;
}

/** 限制请求大小，使用服务端随机路径防止覆盖已有文件。 */
export function createRoutes(services: Services) {
    const app = new OpenAPIHono({ defaultHook: zodValidationErrorHandler });
    app.use(route.path, bodyLimit({
        maxSize: 5 * 1024 * 1024,
        onError: (c) => c.json({ error: '请求体超过 5 MiB' }, 413),
    }));
    app.openapi(route, async (c) => {
        const { file } = c.req.valid('form');
        const bytes = Buffer.from(await file.arrayBuffer());
        const type = imageType(bytes);
        if (!type) {
            return c.json({ error: '仅支持 PNG、JPEG 图片' }, 415);
        }
        if (!services.upload) {
            throw new Error('图片上传服务未配置');
        }
        const cloudPath = `images/test/${randomUUID()}.${type.extension}`;
        const fileID = await services.upload(cloudPath, bytes, type.contentType);
        return c.json({
            fileID,
            contentType: type.contentType,
            size: bytes.length
        }, 201);
    });
    return app;
}
