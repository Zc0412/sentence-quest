/** dictionaries 路由：处理对应 HTTP 请求与响应。 */
import { Hono } from 'hono';
import type { Services, Dictionary } from '../types/services';
import { validId } from '../schemas/dictionary';
import { visible, publicMetadata } from '../utils/dictionary';
/** 创建路由并注入后端服务依赖。 */
export function createRoutes(services: Services) {
    const app = new Hono();
    // 返回上传脚本登记的题库；未设置状态的旧记录也可读取。
    app.get('/api/dictionaries', async (c) => {
        const rows = await services.list();
        return c.json({ dictionaries: rows.filter(visible).map(publicMetadata) });
    });
    // 返回单个已发布题库的公开资料。
    app.get('/api/dictionaries/:id', async (c) => {
        const id = c.req.param('id');
        if (!validId(id))
            return c.json({ error: '题库 ID 无效' }, 400);
        const row = await services.get(id);
        if (!row || !visible(row))
            return c.json({ error: '题库不存在' }, 404);
        return c.json({ dictionary: publicMetadata(row) });
    });
    // 按数据库记录下载文件，客户端不能指定任意云存储路径。
    app.get('/api/dictionaries/:id/content', async (c) => {
        const id = c.req.param('id');
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id))
            return c.json({ error: '题库 ID 无效' }, 400);
        const row = await services.get(id);
        if (!row || !visible(row) || !row.fileID?.startsWith('cloud://'))
            return c.json({ error: '题库不存在' }, 404);
        const offset = Number(c.req.query('offset') || 0);
        if (!Number.isSafeInteger(offset) || offset < 0)
            return c.json({ error: '分页参数无效' }, 400);
        if (c.req.query('version') && c.req.query('version') !== row.sha256)
            return c.json({ error: '题库已更新，请刷新目录' }, 409);
        const bytes = await services.download(row.fileID);
        const rows = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
        if (!Array.isArray(rows) || offset > rows.length)
            throw new Error('题库文件格式无效');
        // 限制每页 JSON 字节数，避免超过小程序云托管响应大小限制。
        const items: unknown[] = [];
        let size = 0;
        let index = offset;
        while (index < rows.length) {
            const itemSize = Buffer.byteLength(JSON.stringify(rows[index]), 'utf8') + 1;
            if (itemSize > 240 * 1024)
                return c.json({ error: '单条题目过大' }, 413);
            if (size + itemSize > 240 * 1024)
                break;
            items.push(rows[index++]);
            size += itemSize;
        }
        return c.json({ items, next: index < rows.length ? index : null, sha256: row.sha256 });
    });
    return app;
}
