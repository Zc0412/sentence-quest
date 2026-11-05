/** 验证云托管接口的题库访问边界和发音参数转发。 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createApp, type Dictionary } from './app';

const published: Dictionary = { id: 'test', label: '测试', kind: 'word', category: '单词', wordCount: 1, sha256: 'a'.repeat(64), fileID: 'cloud://test/file' };
const hidden = { ...published, id: 'hidden', status: 'draft' };
const app = createApp({
  async list() { return [published, hidden]; },
  async get(id) { return [published, hidden].find((row) => row.id === id); },
  async download(fileID) { assert.equal(fileID, published.fileID); return Buffer.from('[{"name":"cat"}]'); },
  async pronounce(event) { return event.word === 'cat' && event.type === '1' ? { ok: true, audio: 'YQ==' } : { ok: false, error: '无效' }; },
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
