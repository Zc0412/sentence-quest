/** 验证 MySQL 配置与题库查询参数，避免输入被拼接为 SQL。 */
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createDatabasePool} from '../db/mysql';
import {createDatabaseIfMissing} from '../db/provision';
import {createDictionaryRepository} from '../repositories/dictionary';

test('缺少数据库配置时明确报错', () => {
    assert.throws(() => createDatabasePool({}), /MYSQL_HOST/);
    assert.throws(() => createDatabasePool({
        MYSQL_HOST: 'localhost', MYSQL_USERNAME: 'user', MYSQL_PASSWORD: 'secret',
        MYSQL_DATABASE: 'sentleap', MYSQL_PORT: 'bad',
    }), /MYSQL_PORT/);
});

test('初始化数据库时转义名称并拒绝无效长度', async () => {
    const statements: string[] = [];
    const connection = {
        async query(sql: string) {
            statements.push(sql);
            return [{}, []];
        },
    };

    await createDatabaseIfMissing(connection as any, 'sent`leap');
    assert.deepEqual(statements, [
        'CREATE DATABASE IF NOT EXISTS `sent``leap` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    ]);
    await assert.rejects(createDatabaseIfMissing(connection as any, 'x'.repeat(65)), /1 到 64 个字符/);
    assert.equal(statements.length, 1);
});

test('题库 ID 参数绑定，更新上传元数据但不改变 ID 和创建时间', async () => {
    const calls: {sql: string; values: unknown[]}[] = [];
    const pool = {
        /** 模拟执行结果，记录参数化查询用于检查边界。 */
        async query(options: {sql: string}, values: unknown[] = []) {
            const sql = options.sql;
            calls.push({sql, values});
            return sql.startsWith('select') ? [[], []] : [{affectedRows: 1}, []];
        },
    };
    const repository = createDictionaryRepository(pool as any);
    const id = "test' OR 1=1 --";
    await repository.get(id);
    assert.ok(!calls[0].sql.includes(id));
    assert.deepEqual(calls[0].values, [id]);
    assert.equal(await repository.update('test', {
        label: '新名称',
        createdAt: '禁止修改',
        fileID: 'cloud://env/file',
        sha256: 'a'.repeat(64),
        cloudPath: 'dictionaries/word/test/new.json',
        wordCount: 2,
        kind: 'word',
        id: 'other',
        status: 'archived',
    }), true);
    assert.match(calls[1].sql, /update `dictionaries` set `label` = \?, `kind` = \?, `wordCount` = \?, `sha256` = \?, `fileID` = \?, `cloudPath` = \?, `status` = \? where/);
    assert.deepEqual(calls[1].values, [
        '新名称', 'word', 2, 'a'.repeat(64), 'cloud://env/file',
        'dictionaries/word/test/new.json', 'archived', 'test',
    ]);
});

test('新增题库时参数化写入全部上传元数据', async () => {
    let supplied: unknown[] = [];
    const repository = createDictionaryRepository({
        async query(options: {sql: string}, values: unknown[]) {
            assert.ok(options.sql.startsWith('insert into `dictionaries`'));
            supplied = values;
            return [{affectedRows: 1}, []];
        },
    } as any);
    const record = {
        id: 'CET4_T',
        label: '四级',
        kind: 'word' as const,
        category: '英语',
        wordCount: 1,
        sha256: 'a'.repeat(64),
        fileID: 'cloud://env/file',
        cloudPath: 'dictionaries/word/CET4_T/test.json',
        status: 'published',
        createdAt: '2026-11-06T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z',
    };
    await repository.create(record);
    assert.deepEqual(supplied, [
        record.id, record.label, record.kind, record.category, record.wordCount,
        record.sha256, record.fileID, record.cloudPath, record.status,
        record.createdAt, record.updatedAt,
    ]);
});

test('更新不存在的题库不会报告成功', async () => {
    const repository = createDictionaryRepository({
        /** 模拟数据库未匹配记录。 */
        async query() { return [{affectedRows: 0}, []]; },
    } as any);
    assert.equal(await repository.update('missing', {status: 'archived'}), false);
});
