import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepare, uploadAndRecord } from './upload-cloud-dictionary';
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'web/public/dictionaries/words/CET4_T.json');
const options = { file: source, id: 'CET4_T', kind: 'word', label: 'CET-4', env: 'test-env' };
test('保持原始内容和顺序，生成稳定且按内容区分的云路径', () => {
  const result = prepare(options);
  assert.equal(result.metadata.wordCount, 2607);
  assert.equal(result.metadata.sha256, '6dc78045551f90c687aa5918292d11649c846b436b6b93f47256747e25d35d2b');
  assert.match(result.metadata.cloudPath, /^dictionaries\/word\/CET4_T\/[a-f0-9]{64}\.json$/);
  assert.deepEqual(result.bytes, fs.readFileSync(source));
});
test('支持短语，拒绝错误结构和不安全的题库 ID', () => {
  const phrase = prepare({ ...options, file: path.join(root, 'web/public/dictionaries/words/everyday-expressions-900.json'), id: 'phrase-sentences', kind: 'phrase' });
  assert.equal(phrase.metadata.wordCount, 900);
  assert.throws(() => prepare({ ...options, id: '../escape' }), /题库 ID/);
  assert.throws(() => prepare({ ...options, kind: 'phrase' }), /不符合/);
});
test('批量预览验证全部 Web 题库', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/upload-cloud-dictionary.ts', '--all'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const plans = JSON.parse(result.stdout.slice(0, result.stdout.lastIndexOf('\n以上为预览')));
  assert.equal(plans.length, 195);
  assert.ok(plans.some((entry) => entry.id === 'CET4_T'));
  assert.ok(plans.some((entry) => entry.id === 'phrase-sentences'));
});
test('默认仅预览，未配置凭据时拒绝上传', () => {
  const args = ['--import', 'tsx', 'scripts/upload-cloud-dictionary.ts', '--file', source, '--id', 'CET4_T', '--kind', 'word', '--label', 'CET-4', '--env', 'test-env'];
  const env = { ...process.env, TENCENTCLOUD_SECRETID: '', TENCENTCLOUD_SECRETKEY: '', CLOUDBASE_APIKEY: '' };
  const preview = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8' });
  assert.equal(preview.status, 0, preview.stderr); assert.match(preview.stdout, /未上传/);
  const upload = spawnSync(process.execPath, [...args, '--upload'], { cwd: root, env, encoding: 'utf8' });
  assert.notEqual(upload.status, 0); assert.match(upload.stderr, /环境变量/);
});
test('上传成功后将真实文件 ID 和题库信息写入数据库', async () => {
  const plan = prepare(options); let uploaded; let written; let selected;
  const app = {
    uploadFile: async (input) => { uploaded = input; return { fileID: 'cloud://test-env/bucket/CET4_T.json' }; },
    database: () => ({ collection: (name) => ({ add: async (record) => { written = record; return {}; }, doc: (id) => { selected = { name, id }; return {
      get: async () => ({ data: [] }), update: async () => { throw new Error('不应更新'); },
    }; } }) }),
  };
  const record = await uploadAndRecord(plan, app);
  assert.deepEqual(selected, { name: 'dictionaries', id: 'CET4_T' });
  assert.equal(uploaded.cloudPath, plan.metadata.cloudPath); assert.deepEqual(uploaded.fileContent, plan.bytes);
  assert.equal(record.fileID, 'cloud://test-env/bucket/CET4_T.json');
  assert.equal(written.fileID, record.fileID); assert.equal(written.wordCount, 2607); assert.equal(written.sha256, plan.metadata.sha256);
  assert.equal(written._id, 'CET4_T');
  assert.ok(written.createdAt); assert.ok(written.updatedAt); assert.equal('envId' in written, false);
});
test('已有记录只更新指定字段；上传或数据库失败时准确报错', async () => {
  const plan = prepare(options); let changed; let writes = 0;
  const ref = { get: async () => ({ data: [{ _id: 'CET4_T', custom: '保留' }] }), update: async (data) => { writes++; changed = data; return {}; } };
  const app = { database: () => ({ collection: () => ({ doc: () => ref, add: async () => { throw new Error('不应覆盖'); } }) }), uploadFile: async () => ({ fileID: 'cloud://test-env/bucket/file.json' }) };
  await uploadAndRecord(plan, app); assert.equal(writes, 1); assert.equal('custom' in changed, false); assert.equal('createdAt' in changed, false);
  const brokenUpload = { ...app, uploadFile: async () => ({ code: 'FAIL', message: '上传失败' }) };
  await assert.rejects(uploadAndRecord(plan, brokenUpload), /上传文件失败/); assert.equal(writes, 1);
  const brokenDb = { ...app, database: () => ({ collection: () => ({ add: async () => ({}), doc: () => ({ ...ref, update: async () => { throw new Error('写入失败'); } }) }) }) };
  await assert.rejects(uploadAndRecord(plan, brokenDb), /文件已上传.*cloud:\/\//);
});
