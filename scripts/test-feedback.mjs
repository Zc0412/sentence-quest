import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/app/api/feedback/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { POST } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const data = { id: 'a54bb855-9084-45b7-9dde-fd916ea0af9a', type: 'bug', content: '测试反馈', contact: '', page: '/settings?private=value' };
const request = (body = data, origin = 'https://example.com') => new Request('https://example.com/api/feedback', {
  method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body),
});
const oldFetch = globalThis.fetch;
const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
try {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal((await POST(request())).status, 503);
  assert.equal((await POST(request(data, 'https://evil.example'))).status, 403);
  assert.equal((await POST(request({ ...data, content: ' ' }))).status, 400);
  assert.equal((await POST(request({ ...data, content: 'x'.repeat(2001) }))).status, 400);
  assert.equal((await POST(request({ ...data, content: 'x'.repeat(17000) }))).status, 413);
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-secret';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://example.upstash.io/');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    const command = JSON.parse(options.body);
    assert.equal(command[0], 'EVAL');
    assert.equal(command[3], 'sentleap:feedback');
    const record = JSON.parse(command.at(-1));
    assert.equal(record.content, data.content);
    assert.equal(record.page, '/settings');
    assert.equal(record.status, 'new');
    assert.ok(!options.body.includes('test-secret'));
    return Response.json({ result: 1 });
  };
  assert.equal((await POST(request())).status, 200);
  globalThis.fetch = async () => Response.json({ result: 0 });
  assert.equal((await POST(request())).status, 429);
  globalThis.fetch = async () => Response.json({ error: 'secret backend details' });
  const failed = await POST(request());
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes('secret backend details'));
  globalThis.fetch = async () => { throw new Error('timeout'); };
  assert.equal((await POST(request())).status, 503);
  console.log('✅ Feedback API: validation, origin, size limit, configuration, persistence payload, rate limit and failure handling');
} finally {
  globalThis.fetch = oldFetch;
  for (const [name, value] of [['UPSTASH_REDIS_REST_URL', oldUrl], ['UPSTASH_REDIS_REST_TOKEN', oldToken]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}
