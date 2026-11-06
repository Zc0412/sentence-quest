#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as cloudbase from '@cloudbase/node-sdk';
import config from '../miniprogram/config';
import {createDatabasePool} from '../cloud-service/src/db/mysql';
import {createDictionaryRepository} from '../cloud-service/src/repositories/dictionary';
interface UploadOptions {
    file?: string;
    id?: string;
    kind?: string;
    label?: string;
    category?: string;
    env?: string;
    upload?: boolean;
    help?: boolean;
    all?: boolean;
}
interface DictionaryMetadata {
    id: string;
    label: string;
    kind: string;
    category: string;
    wordCount: number;
    sha256: string;
    cloudPath: string;
    envId: string;
}
interface Plan {
    bytes: Buffer;
    metadata: DictionaryMetadata;
}
interface CloudClient {
    uploadFile(options: {
        cloudPath: string;
        fileContent: Buffer;
    }): Promise<any>;
}
interface DictionaryStore {
    get(id: string): Promise<unknown>;
    create(record: any): Promise<void>;
    update(id: string, fields: any): Promise<boolean>;
}
/** 显示上传参数及默认仅预览的行为。 */
function usage() {
    console.log('用法: npm run upload:dictionary -- --file <JSON文件> --id <题库ID> --kind <word|phrase> --label <名称> [--category <分类>] [--env <环境ID>] [--upload]');
    console.log('批量上传 Web 题库: npm run upload:dictionary -- --all [--env <环境ID>] [--upload]');
    console.log('默认只校验并显示上传计划；加 --upload 后上传并写入 MySQL dictionaries 表。');
}
/** 解析命令行参数并拒绝未知选项。 */
function argumentsOf(args: string[]): UploadOptions {
    const options: UploadOptions = {};
    const flags = new Set(['upload', 'help', 'all']);
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (!arg.startsWith('--'))
            throw new Error(`不支持的参数: ${arg}`);
        const key = arg.slice(2);
        if (flags.has(key)) {
            options[key] = true;
            continue;
        }
        if (!['file', 'id', 'kind', 'label', 'category', 'env'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--'))
            throw new Error(`参数 ${arg} 无效或缺少值`);
        options[key] = args[++i];
    }
    return options;
}
/** 校验原始题库并计算版本哈希，保留条目顺序。 */
function prepare(options: UploadOptions) {
    if (!options.file || !options.id || !options.label || !['word', 'phrase'].includes(options.kind))
        throw new Error('请填写 --file、--id、--kind 和 --label');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(options.id))
        throw new Error('题库 ID 只能包含字母、数字、点、横线或下划线');
    if (!/\.json$/i.test(options.file))
        throw new Error('请选择 JSON 文件');
    const bytes = fs.readFileSync(path.resolve(options.file));
    let rows;
    try {
        rows = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    }
    catch (_) {
        throw new Error('JSON 格式无效');
    }
    if (!Array.isArray(rows) || !rows.length)
        throw new Error('题库必须是非空 JSON 数组');
    const ids = new Set();
    rows.forEach((row, index) => {
        const validWord = row && typeof row.name === 'string' && row.name.trim() && Array.isArray(row.trans) && row.trans.length && row.trans.every((value) => typeof value === 'string' && value.trim());
        const validPhrase = row && typeof row.id === 'string' && row.id.trim() && typeof row.zh === 'string' && row.zh.trim() && typeof row.english === 'string' && row.english.trim() && Array.isArray(row.words) && row.words.length && row.words.every((word) => typeof word === 'string' && word.trim());
        if (!(options.kind === 'word' ? validWord : validPhrase))
            throw new Error(`第 ${index + 1} 条数据不符合 ${options.kind} 题库格式`);
        if (options.kind === 'phrase') {
            if (ids.has(row.id))
                throw new Error(`第 ${index + 1} 条的 ID 重复: ${row.id}`);
            ids.add(row.id);
        }
    });
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    return { bytes, metadata: { id: options.id, label: options.label, kind: options.kind, category: options.category || (options.kind === 'word' ? '单词练习' : '短语练习'), wordCount: rows.length, sha256, cloudPath: `dictionaries/${options.kind}/${options.id}/${sha256}.json`, envId: options.env || config.cloudEnvId } };
}
/** 检查云存储 SDK 的业务错误。 */
function checkResult(result: any, action: string) {
    if (result && result.code && result.code !== 0 && result.code !== '0')
        throw new Error(`${action}失败: ${result.message || result.code}`);
    if (result && result.error)
        throw new Error(`${action}失败: ${result.error.message || result.error}`);
}
/** 上传 JSON 并登记 MySQL；写库失败时保留文件以便重试。 */
async function uploadAndRecord(plan: Plan, app: CloudClient, database: DictionaryStore) {
    const { bytes, metadata } = plan;
    const existing = await database.get(metadata.id);
    const uploaded = await app.uploadFile({ cloudPath: metadata.cloudPath, fileContent: bytes });
    checkResult(uploaded, '上传文件');
    if (typeof uploaded.fileID !== 'string' || !uploaded.fileID.startsWith('cloud://'))
        throw new Error('上传未返回有效文件 ID，无法写入数据库');
    const now = new Date().toISOString();
    const { envId, ...fields } = metadata;
    const record = { ...fields, fileID: uploaded.fileID, updatedAt: now };
    try {
        if (existing) {
            if (!await database.update(metadata.id, record))
                throw new Error('题库记录已变化，请重新运行');
        }
        else {
            await database.create({ ...record, createdAt: now, status: 'published' });
        }
    }
    catch (error) {
        throw new Error(`文件已上传，但数据库写入失败。fileID: ${uploaded.fileID}；可重新运行相同命令重试。原因: ${error.message}`);
    }
    return record;
}
/** 执行预览或批量上传，完成后释放 MySQL 连接池。 */
async function main(args: string[]) {
    const options = argumentsOf(args);
    if (options.help) {
        usage();
        return;
    }
    if (options.all && ['file', 'id', 'kind', 'label', 'category'].some((key) => options[key]))
        throw new Error('--all 不能与单题库参数同时使用');
    const base = path.resolve(__dirname, '../web/public/dictionaries/words');
    const selected = options.all ? [
        ...JSON.parse(fs.readFileSync(path.join(base, '../../../src/data/vocabulary-catalog.json'), 'utf8')).map((list) => ({ file: path.join(base, `${list.id}.json`), id: list.id, label: list.label, category: list.category, kind: 'word', env: options.env })),
        { file: path.join(base, 'everyday-expressions-900.json'), id: 'phrase-sentences', label: '常用表达 · 场景篇', kind: 'phrase', env: options.env },
        { file: path.join(base, 'basic-sentence-patterns-1000.json'), id: 'phrase-english-sentences', label: '常用表达 · 句型篇', kind: 'phrase', env: options.env },
    ] : [options];
    const plans = selected.map(prepare);
    if (plans.some(({ metadata }) => !metadata.envId))
        throw new Error('缺少云环境 ID，请使用 --env 指定');
    console.log(JSON.stringify(options.all ? plans.map(({ metadata }) => metadata) : plans[0].metadata, null, 2));
    if (!options.upload) {
        console.log('以上为预览，未上传。添加 --upload 后执行上传。');
        return;
    }
    if (!process.env.CLOUDBASE_APIKEY && !(process.env.TENCENTCLOUD_SECRETID && process.env.TENCENTCLOUD_SECRETKEY))
        throw new Error('请在本机环境变量配置云开发 API Key 或腾讯云密钥对；不要将密钥写入代码');
    const app = cloudbase.init({ env: plans[0].metadata.envId });
    const pool = createDatabasePool();
    const database = createDictionaryRepository(pool);
    try {
        for (const plan of plans) {
            console.log(`正在上传 ${plan.metadata.id}…`);
            const record = await uploadAndRecord(plan, app, database);
            console.log(`已登记 ${record.id}：${record.fileID}`);
        }
        console.log('上传完成，文件 ID 和题库资料已写入 MySQL dictionaries 表。');
    }
    finally {
        await pool.end();
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    main(process.argv.slice(2)).catch((error) => { console.error(`上传工具：${error.message}`); process.exitCode = 1; });
}
export { argumentsOf, prepare, uploadAndRecord };
