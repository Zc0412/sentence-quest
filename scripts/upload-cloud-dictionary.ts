#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import config from '../miniprogram/config';
interface UploadOptions { file?: string; id?: string; kind?: string; label?: string; env?: string; upload?: boolean; help?: boolean; all?: boolean }

function usage() {
  console.log('用法: npm run upload:dictionary -- --file <JSON文件> --id <题库ID> --kind <word|phrase> --label <名称> [--env <环境ID>] [--upload]');
  console.log('批量上传 Web 题库: npm run upload:dictionary -- --all [--env <环境ID>] [--upload]');
  console.log('默认只校验并显示上传计划；加 --upload 才使用已登录的 tcb 上传。');
}
function argumentsOf(args: string[]): UploadOptions {
  const options: UploadOptions = {}; const flags = new Set(['upload', 'help', 'all']);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) throw new Error(`不支持的参数: ${arg}`);
    const key = arg.slice(2);
    if (flags.has(key)) { options[key] = true; continue; }
    if (!['file', 'id', 'kind', 'label', 'env'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`参数 ${arg} 无效或缺少值`);
    options[key] = args[++i];
  }
  return options;
}
function prepare(options: UploadOptions) {
  if (!options.file || !options.id || !options.label || !['word', 'phrase'].includes(options.kind)) throw new Error('请填写 --file、--id、--kind 和 --label');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(options.id)) throw new Error('题库 ID 只能包含字母、数字、点、横线或下划线');
  if (!/\.json$/i.test(options.file)) throw new Error('请选择 JSON 文件');
  const bytes = fs.readFileSync(path.resolve(options.file));
  let rows;
  try { rows = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); } catch (_) { throw new Error('JSON 格式无效'); }
  if (!Array.isArray(rows) || !rows.length) throw new Error('题库必须是非空 JSON 数组');
  const ids = new Set();
  rows.forEach((row, index) => {
    const validWord = row && typeof row.name === 'string' && row.name.trim() && Array.isArray(row.trans) && row.trans.length && row.trans.every((value) => typeof value === 'string' && value.trim());
    const validPhrase = row && typeof row.id === 'string' && row.id.trim() && typeof row.zh === 'string' && row.zh.trim() && typeof row.english === 'string' && row.english.trim() && Array.isArray(row.words) && row.words.length && row.words.every((word) => typeof word === 'string' && word.trim());
    if (!(options.kind === 'word' ? validWord : validPhrase)) throw new Error(`第 ${index + 1} 条数据不符合 ${options.kind} 题库格式`);
    if (options.kind === 'phrase') { if (ids.has(row.id)) throw new Error(`第 ${index + 1} 条的 ID 重复: ${row.id}`); ids.add(row.id); }
  });
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  return { bytes, metadata: { id: options.id, label: options.label, kind: options.kind, wordCount: rows.length, sha256, cloudPath: `dictionaries/${options.kind}/${options.id}/${sha256}.json`, envId: options.env || config.cloudEnvId } };
}
function main(args) {
  const options = argumentsOf(args);
  if (options.help) { usage(); return; }
  if (options.all && ['file', 'id', 'kind', 'label'].some((key) => options[key])) throw new Error('--all 不能与单题库参数同时使用');
  const base = path.resolve(__dirname, '../web/public/dictionaries/words');
  const selected = options.all ? [
    ...JSON.parse(fs.readFileSync(path.join(base, '../../../src/data/vocabulary-catalog.json'), 'utf8')).map((list) => ({ file: path.join(base, `${list.id}.json`), id: list.id, label: list.label, kind: 'word', env: options.env })),
    { file: path.join(base, 'everyday-expressions-900.json'), id: 'phrase-sentences', label: '常用表达 · 场景篇', kind: 'phrase', env: options.env },
    { file: path.join(base, 'basic-sentence-patterns-1000.json'), id: 'phrase-english-sentences', label: '常用表达 · 句型篇', kind: 'phrase', env: options.env },
  ] : [options];
  const plans = selected.map(prepare);
  if (plans.some(({ metadata }) => !metadata.envId)) throw new Error('缺少云环境 ID，请使用 --env 指定');
  console.log(JSON.stringify(options.all ? plans.map(({ metadata }) => metadata) : plans[0].metadata, null, 2));
  if (!options.upload) { console.log('以上为预览，未上传。添加 --upload 后执行上传。'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentleap-upload-'));
  try {
    for (const { bytes, metadata } of plans) {
      console.log(`正在上传 ${metadata.id}…`);
      const snapshot = path.join(dir, `${metadata.id}.json`); fs.writeFileSync(snapshot, bytes);
      const result = spawnSync('tcb', ['storage', 'upload', snapshot, metadata.cloudPath, '-e', metadata.envId], { stdio: 'inherit' });
      if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('未找到 tcb，请安装 @cloudbase/cli 并登录');
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`${metadata.id} 上传失败（退出码 ${result.status ?? '未知'}），此前成功的文件仍保留在云端`);
    }
    console.log('上传成功。请保留以上题库 ID、SHA-256 和云存储路径；接入小程序时需要对应文件 ID。');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(`上传工具：${error.message}`); process.exitCode = 1; }
}
export { argumentsOf, prepare };
