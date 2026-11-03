import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepare } from './upload-cloud-dictionary';
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
test('默认不上传，指定上传时传递已验证内容和云路径', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentleap-upload-test-'));
  try {
    const marker = path.join(dir, 'called.json');
    const fake = path.join(dir, 'tcb');
    fs.writeFileSync(fake, '#!/usr/bin/env node\nconst fs=require("fs");const crypto=require("crypto");fs.writeFileSync(process.env.UPLOAD_TEST_MARKER,JSON.stringify({args:process.argv.slice(2),sha:crypto.createHash("sha256").update(fs.readFileSync(process.argv[4])).digest("hex")}));\n', { mode: 0o755 });
    const args = ['--import', 'tsx', 'scripts/upload-cloud-dictionary.ts', '--file', source, '--id', 'CET4_T', '--kind', 'word', '--label', 'CET-4', '--env', 'test-env'];
    const env = { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, UPLOAD_TEST_MARKER: marker };
    let result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.equal(fs.existsSync(marker), false);
    result = spawnSync(process.execPath, [...args, '--upload'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const call = JSON.parse(fs.readFileSync(marker, 'utf8'));
    assert.deepEqual(call.args.slice(0, 2), ['storage', 'upload']);
    assert.equal(call.args[3], prepare(options).metadata.cloudPath);
    assert.deepEqual(call.args.slice(4), ['-e', 'test-env']);
    assert.equal(call.sha, prepare(options).metadata.sha256);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
