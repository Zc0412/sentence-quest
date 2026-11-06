/** 验证 MySQL 配置与题库查询参数，避免输入被拼接为 SQL。 */
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createDatabasePool} from '../db/mysql';
import {createDictionaryRepository} from '../repositories/dictionary';

test('缺少数据库配置时明确报错', () => {
    assert.throws(() => createDatabasePool({}), /MYSQL_HOST/);
    assert.throws(() => createDatabasePool({
        MYSQL_HOST: 'localhost', MYSQL_USERNAME: 'user', MYSQL_PASSWORD: 'secret',
        MYSQL_DATABASE: 'sentleap', MYSQL_PORT: 'bad',
    }), /MYSQL_PORT/);
});

test('题库 ID 参数绑定，更新仅允许指定列且不改变创建时间', async () => {
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
    assert.equal(await repository.update('test', {label: '新名称', createdAt: '禁止修改', id: 'other', status: 'archived'}), true);
    assert.match(calls[1].sql, /update `dictionaries` set `label` = \?, `status` = \? where/);
    assert.deepEqual(calls[1].values, ['新名称', 'archived', 'test']);
});

test('新增题库绑定全部字段，数据库唯一约束错误向上返回', async () => {
    let supplied: unknown[] = [];
    const duplicate = new Error('duplicate');
    const repository = createDictionaryRepository({
        /** 模拟 MySQL 主键冲突，验证不静默覆盖已有题库。 */
        async query(options: {sql: string}, values: unknown[]) {
            const sql = options.sql;
            assert.ok(sql.startsWith('insert into `dictionaries`'));
            supplied = values;
            throw duplicate;
        },
    } as any);
    const record = {
        id: 'CET4_T', label: '四级', kind: 'word', category: '英语',
        wordCount: 1, sha256: 'a'.repeat(64), fileID: 'cloud://env/file',
        cloudPath: 'dictionaries/test.json',
        createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z',
    };
    await assert.rejects(repository.create(record), (error: any) => error === duplicate || error.cause === duplicate);
    assert.deepEqual(supplied, [
        record.id, record.label, record.kind, record.category, record.wordCount,
        record.sha256, record.fileID, record.cloudPath, 'published',
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
