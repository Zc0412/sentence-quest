/** 验证云托管接口的题库访问边界和发音参数转发。 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {createApp} from '../app';
import type {Dictionary} from '../types/services';

const published: Dictionary = { id: 'test', label: '测试', kind: 'word', category: '单词', wordCount: 1, sha256: 'a'.repeat(64), fileID: 'cloud://test/file' };
const hidden = { ...published, id: 'hidden', status: 'draft' };
const app = createApp({
  async list() { return [published, hidden]; },
  async get(id) { return [published, hidden].find((row) => row.id === id); },
  async download(fileID) { assert.equal(fileID, published.fileID); return Buffer.from('[{"name":"cat"}]'); },
  async pronounce(event) { return event.word === 'cat' && event.type === '1' ? { ok: true, audio: 'YQ==' } : { ok: false, error: '无效' }; },
});

test('Swagger UI 与 OpenAPI 文档可访问', async () => {
  const ui = await app.request('/swagger');
  assert.equal(ui.status, 200);
  assert.match(ui.headers.get('content-type') || '', /text\/html/);
  assert.match(await ui.text(), /swagger-ui/);

  const response = await app.request('/openapi.json');
  assert.equal(response.status, 200);
  const document = await response.json() as any;
  assert.equal(document.openapi, '3.0.0');
  assert.ok(document.paths['/api/admin/dictionaries'].post.requestBody);
  assert.ok(document.paths['/api/admin/dictionaries'].post.responses['201']);
  assert.equal(document.paths['/api/admin/dictionaries'].post.security, undefined);
  assert.equal(document.paths['/api/admin/upload-dictionary'].post.security, undefined);
  assert.equal(
    document.components.schemas.UploadDictionaryFileRequest.properties.file.format,
    'binary',
  );
  assert.ok(document.components.schemas.CreateWordDictionaryRequest.required.includes('entries'));
  assert.ok(document.paths['/api/admin/dictionaries/{id}'].delete);
  assert.equal(document.components.securitySchemes.AdminBearerAuth.scheme, 'bearer');
});

test('目录不暴露文件 ID 或未发布题库', async () => {
  const response = await app.request('/api/dictionaries');
  const result = await response.json() as any;
  assert.equal(result.dictionaries.length, 1);
  assert.equal(result.dictionaries[0].id, 'test');
  assert.equal(result.dictionaries[0].fileID, undefined);
});
test('内容只能通过已发布题库 ID 获取', async () => {
  assert.equal((await app.request('/api/dictionaries/hidden/content')).status, 404);
  assert.equal((await app.request('/api/dictionaries/nope/content')).status, 404);
  const response = await app.request('/api/dictionaries/test/content');
  assert.deepEqual(await response.json(), { items: [{ name: 'cat' }], next: null, sha256: published.sha256 });
  assert.equal((await app.request('/api/dictionaries/test/content?version=old')).status, 409);
});
test('发音接口处理合法和无效请求', async () => {
  const request = (body: string) => app.request('/api/pronunciation', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal((await request('{')).status, 400);
  assert.equal((await request('{"word":12,"type":"1"}')).status, 400);
  const invalid = await request('{"word":"","type":"1"}');
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json() as {error: string}).error, /无效/);
  assert.equal((await request('{"word":"cat","type":"2"}')).status, 400);
  assert.deepEqual(await (await request('{"word":"cat","type":"1"}')).json(), { ok: true, audio: 'YQ==' });
});

test('大题库分批返回且保持顺序', async () => {
  const source = Array.from({ length: 8 }, (_, index) => ({ index, text: '中'.repeat(20000) }));
  const large = createApp({
    async list() { return [published]; },
    async get() { return published; },
    async download() { return Buffer.from(JSON.stringify(source)); },
    async pronounce() { return { ok: false }; },
  });
  const first = await (await large.request('/api/dictionaries/test/content?offset=0')).json() as any;
  assert.ok(first.next > 0 && first.next < source.length);
  const second = await (await large.request(`/api/dictionaries/test/content?offset=${first.next}`)).json() as any;
  assert.deepEqual([...first.items, ...second.items], source);
  assert.equal(second.next, null);
});

test('题库详情只返回可见题库公开资料', async () => {
  assert.equal((await app.request('/api/dictionaries/hidden')).status, 404);
  const result = await (await app.request('/api/dictionaries/test')).json() as any;
  assert.equal(result.dictionary.id, 'test');
  assert.equal(result.dictionary.fileID, undefined);
});

test('Swagger 上传题库 JSON 暂不鉴权，元数据更新和下架仍需鉴权', async () => {
  const token = 'x'.repeat(32);
  const record: Dictionary = { ...published, id: 'cet4', label: '四级' };
  const records = new Map<string, Dictionary>([[record.id, record]]);
  let uploaded: {path: string; content: Buffer} | undefined;
  const admin = createApp({
    adminToken: token,
    async list() { return [...records.values()]; },
    async get(id) { return records.get(id); },
    async download() { return Buffer.from('[{"name":"cat","trans":["n. 猫"]}]'); },
    async upload(path, content) { uploaded = {path, content}; return 'cloud://test/new-file'; },
    async create(value) { records.set(value.id, value); },
    async update(id, fields) { const row = records.get(id); if (!row) return false; records.set(id, { ...row, ...fields }); return true; },
    async pronounce() { return { ok: false }; },
  });
  const request = (path: string, method: string, body?: unknown, key = token) => admin.request(path, { method, headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = { id: 'cet4', label: '四级', kind: 'word', entries: [{ name: 'cat', trans: ['n. 猫'] }] };
  const uploadResponse = await admin.request('/api/admin/dictionaries', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({...data, id: 'new-cet4'}),
  });
  assert.equal(uploadResponse.status, 201);
  assert.equal(uploaded?.path, `dictionaries/word/new-cet4/${records.get('new-cet4')!.sha256}.json`);
  assert.deepEqual(JSON.parse(uploaded!.content.toString('utf8')), data.entries);
  const form = new FormData();
  form.set('id', 'file-cet4');
  form.set('label', '文件上传测试');
  form.set('kind', 'word');
  form.set('file', new Blob([JSON.stringify(data.entries)], {type: 'application/json'}), 'dictionary.json');
  const fileUploadResponse = await admin.request('/api/admin/upload-dictionary', {
    method: 'POST',
    body: form,
  });
  assert.equal(fileUploadResponse.status, 201);
  assert.equal(records.get('file-cet4')!.wordCount, 1);
  assert.deepEqual(JSON.parse(uploaded!.content.toString('utf8')), data.entries);
  assert.equal((await request('/api/admin/dictionaries', 'POST', { ...data, entries: [] })).status, 400);
  assert.equal((await request('/api/admin/dictionaries', 'POST', data)).status, 409);
  assert.equal((await request('/api/admin/dictionaries/cet4', 'PUT', { kind: 'phrase' })).status, 400);
  assert.equal((await request('/api/admin/dictionaries/cet4', 'PUT', { label: '新四级', entries: [{ name: 'dog', trans: ['n. 狗'] }] })).status, 403);
  assert.equal((await request('/api/admin/dictionaries/cet4', 'PUT', { label: '新四级' })).status, 200);
  assert.equal(records.get('cet4')!.sha256, record.sha256);
  assert.equal(records.get('cet4')!.label, '新四级');
  assert.equal((await request('/api/admin/dictionaries/cet4', 'DELETE')).status, 200);
  assert.equal(records.get('cet4')!.status, 'archived');
  assert.equal((await admin.request('/api/dictionaries/cet4')).status, 404);
  assert.equal((await request('/api/admin/dictionaries/cet4', 'PUT', { status: 'published' })).status, 200);
  assert.equal((await admin.request('/api/dictionaries/cet4')).status, 200);
  assert.equal((await request('/api/admin/dictionaries/missing', 'DELETE')).status, 404);
});

test('没有配置管理员令牌时拒绝元数据修改', async () => {
  const response = await app.request('/api/admin/dictionaries/test', {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({label: '更名'}),
  });
  assert.equal(response.status, 401);
});
