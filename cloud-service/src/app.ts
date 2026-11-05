/** 云托管接口：提供发音、题库读取及管理员管理接口。 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { InputError, isAdmin, prepareDictionary, validId, type DictionaryWrite } from './dictionary-admin';

export interface Dictionary { id: string; label: string; kind: string; category: string; wordCount: number; sha256: string; fileID: string; status?: string }
export interface Services {
  list(): Promise<Dictionary[]>;
  get(id: string): Promise<Dictionary | undefined>;
  download(fileID: string): Promise<Buffer>;
  adminToken?: string;
  upload?(cloudPath: string, bytes: Buffer): Promise<string>;
  create?(record: DictionaryWrite): Promise<void>;
  update?(id: string, fields: Partial<DictionaryWrite>): Promise<boolean>;
  pronounce(event: { word?: unknown; type?: string }): Promise<{ ok: boolean; audio?: string; error?: string }>;
}

/** 创建接口应用；注入依赖以便本地验证，不在客户端暴露云数据库凭据。 */
export function createApp(services: Services) {
  const app = new Hono();
  // 返回健康状态，供云托管探测实例。
  app.get('/health', (c) => c.json({ ok: true }));
  // 沿用原发音接口的参数和 Base64 响应，兼容小程序本地音频缓存。
  app.post('/api/pronunciation', async (c) => {
    let body: { word?: unknown; type?: string };
    try { body = await c.req.json(); } catch { return c.json({ ok: false, error: '请求格式无效' }, 400); }
    const result = await services.pronounce(body || {});
    return c.json(result, result.ok ? 200 : 400);
  });
  // 返回上传脚本登记的题库；未设置状态的旧记录也可读取。
  app.get('/api/dictionaries', async (c) => {
    const rows = await services.list();
    return c.json({ dictionaries: rows.filter(visible).map(publicMetadata) });
  });
  // 返回单个已发布题库的公开资料。
  app.get('/api/dictionaries/:id', async (c) => {
    const id = c.req.param('id');
    if (!validId(id)) return c.json({ error: '题库 ID 无效' }, 400);
    const row = await services.get(id);
    if (!row || !visible(row)) return c.json({ error: '题库不存在' }, 404);
    return c.json({ dictionary: publicMetadata(row) });
  });
  // 按数据库记录下载文件，客户端不能指定任意云存储路径。
  app.get('/api/dictionaries/:id/content', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id)) return c.json({ error: '题库 ID 无效' }, 400);
    const row = await services.get(id);
    if (!row || !visible(row) || !row.fileID?.startsWith('cloud://')) return c.json({ error: '题库不存在' }, 404);
    const offset = Number(c.req.query('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return c.json({ error: '分页参数无效' }, 400);
    if (c.req.query('version') && c.req.query('version') !== row.sha256) return c.json({ error: '题库已更新，请刷新目录' }, 409);
    const bytes = await services.download(row.fileID);
    const rows = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(rows) || offset > rows.length) throw new Error('题库文件格式无效');
    // 限制每页 JSON 字节数，避免超过小程序云托管响应大小限制。
    const items: unknown[] = []; let size = 0; let index = offset;
    while (index < rows.length) {
      const itemSize = Buffer.byteLength(JSON.stringify(rows[index]), 'utf8') + 1;
      if (itemSize > 240 * 1024) return c.json({ error: '单条题目过大' }, 413);
      if (size + itemSize > 240 * 1024) break;
      items.push(rows[index++]); size += itemSize;
    }
    return c.json({ items, next: index < rows.length ? index : null, sha256: row.sha256 });
  });
  // 管理接口需要服务端令牌；不依赖客户端可伪造的 OpenID。
  app.use('/api/admin/*', async (c, next) => {
    if (!isAdmin(c.req.header('Authorization'), services.adminToken)) return c.json({ error: '无管理权限' }, 401);
    await next();
  });
  // 限制请求体，避免过大的 JSON 占用容器内存。
  app.use('/api/admin/*', bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => c.json({ error: '请求体超过 5 MiB' }, 413) }));

  // 新建题库并登记云存储返回的文件 ID。
  app.post('/api/admin/dictionaries', async (c) => {
    let input; try { input = await c.req.json(); } catch { return c.json({ error: '请求格式无效' }, 400); }
    try {
      const plan = prepareDictionary(input);
      const id = plan.fields.id!;
      if (await services.get(id)) return c.json({ error: '题库已存在' }, 409);
      const fileID = await services.upload!(plan.fields.cloudPath!, plan.bytes!);
      const record = { ...plan.fields, fileID, createdAt: plan.fields.updatedAt } as DictionaryWrite;
      try { await services.create!(record); } catch (error) { console.error('题库登记失败，保留云文件供排查:', fileID); throw error; }
      return c.json({ dictionary: publicMetadata(record) }, 201);
    } catch (error) { if (error instanceof InputError) return c.json({ error: error.message }, 400); throw error; }
  });

  // 更新资料或替换题目，保留题库 ID 和类型。
  app.put('/api/admin/dictionaries/:id', async (c) => {
    const id = c.req.param('id');
    if (!validId(id)) return c.json({ error: '题库 ID 无效' }, 400);
    let input; try { input = await c.req.json(); } catch { return c.json({ error: '请求格式无效' }, 400); }
    try {
      const existing = await services.get(id);
      if (!existing) return c.json({ error: '题库不存在' }, 404);
      const plan = prepareDictionary(input, existing);
      if (plan.bytes) plan.fields.fileID = await services.upload!(plan.fields.cloudPath!, plan.bytes);
      try { if (!await services.update!(id, plan.fields)) return c.json({ error: '题库不存在' }, 404); }
      catch (error) { if (plan.bytes) console.error('题库更新失败，保留云文件供排查:', plan.fields.fileID); throw error; }
      return c.json({ dictionary: publicMetadata({ ...existing, ...plan.fields } as Dictionary) });
    } catch (error) { if (error instanceof InputError) return c.json({ error: error.message }, 400); throw error; }
  });

  // 下架题库以保留历史进度和文件；需要时可通过更新接口重新发布。
  app.delete('/api/admin/dictionaries/:id', async (c) => {
    const id = c.req.param('id');
    if (!validId(id)) return c.json({ error: '题库 ID 无效' }, 400);
    if (!await services.get(id)) return c.json({ error: '题库不存在' }, 404);
    if (!await services.update!(id, { status: 'archived', updatedAt: new Date().toISOString() })) return c.json({ error: '题库不存在' }, 404);
    return c.json({ ok: true });
  });
  // 避免将 SDK 的错误信息和环境细节暴露给调用方。
  app.onError((error, c) => { console.error('云托管接口失败:', error); return c.json({ error: '服务暂不可用' }, 500); });
  return app;
}

/** 未设置状态的历史题库按已发布处理；显式下架的题库不对外展示。 */
function visible(row: Dictionary) { return (!row.status || row.status === 'published') && ['word', 'phrase'].includes(row.kind); }
/** 只返回小程序需要的目录字段。 */
function publicMetadata(row: Dictionary) { return { id: row.id, label: row.label, kind: row.kind, category: row.category, wordCount: row.wordCount, sha256: row.sha256 }; }
