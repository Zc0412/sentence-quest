/** admin 路由：处理对应 HTTP 请求与响应。 */
import { Hono } from 'hono';
import type { Services, Dictionary } from '../types/services';
import { InputError, prepareDictionary, validId, type DictionaryWrite } from '../schemas/dictionary';
import { publicMetadata } from '../utils/dictionary';
import { adminAuth } from '../middleware/admin-auth';
import { bodyLimit } from 'hono/body-limit';
/** 创建路由并注入后端服务依赖。 */
export function createRoutes(services: Services) {
    const app = new Hono();
    app.use('/api/admin/*', adminAuth(services.adminToken));
    app.use('/api/admin/*', bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => c.json({ error: '请求体超过 5 MiB' }, 413) }));
    // 新建题库并登记云存储返回的文件 ID。
    app.post('/api/admin/dictionaries', async (c) => {
        let input;
        try {
            input = await c.req.json();
        }
        catch {
            return c.json({ error: '请求格式无效' }, 400);
        }
        try {
            const plan = prepareDictionary(input);
            const id = plan.fields.id!;
            if (await services.get(id))
                return c.json({ error: '题库已存在' }, 409);
            const fileID = await services.upload!(plan.fields.cloudPath!, plan.bytes!);
            const record = { ...plan.fields, fileID, createdAt: plan.fields.updatedAt } as DictionaryWrite;
            try {
                await services.create!(record);
            }
            catch (error) {
                console.error('题库登记失败，保留云文件供排查:', fileID);
                throw error;
            }
            return c.json({ dictionary: publicMetadata(record) }, 201);
        }
        catch (error) {
            if (error instanceof InputError)
                return c.json({ error: error.message }, 400);
            throw error;
        }
    });
    // 更新资料或替换题目，保留题库 ID 和类型。
    app.put('/api/admin/dictionaries/:id', async (c) => {
        const id = c.req.param('id');
        if (!validId(id))
            return c.json({ error: '题库 ID 无效' }, 400);
        let input;
        try {
            input = await c.req.json();
        }
        catch {
            return c.json({ error: '请求格式无效' }, 400);
        }
        try {
            const existing = await services.get(id);
            if (!existing)
                return c.json({ error: '题库不存在' }, 404);
            const plan = prepareDictionary(input, existing);
            if (plan.bytes)
                plan.fields.fileID = await services.upload!(plan.fields.cloudPath!, plan.bytes);
            try {
                if (!await services.update!(id, plan.fields))
                    return c.json({ error: '题库不存在' }, 404);
            }
            catch (error) {
                if (plan.bytes)
                    console.error('题库更新失败，保留云文件供排查:', plan.fields.fileID);
                throw error;
            }
            return c.json({ dictionary: publicMetadata({ ...existing, ...plan.fields } as Dictionary) });
        }
        catch (error) {
            if (error instanceof InputError)
                return c.json({ error: error.message }, 400);
            throw error;
        }
    });
    // 下架题库以保留历史进度和文件；需要时可通过更新接口重新发布。
    app.delete('/api/admin/dictionaries/:id', async (c) => {
        const id = c.req.param('id');
        if (!validId(id))
            return c.json({ error: '题库 ID 无效' }, 400);
        if (!await services.get(id))
            return c.json({ error: '题库不存在' }, 404);
        if (!await services.update!(id, { status: 'archived', updatedAt: new Date().toISOString() }))
            return c.json({ error: '题库不存在' }, 404);
        return c.json({ ok: true });
    });
    return app;
}
