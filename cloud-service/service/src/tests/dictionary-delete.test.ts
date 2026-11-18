/** 永久删除回归：不访问真实 MySQL/COS，验证持锁、失败回滚和文件引用保护。 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createDictionaryRepository } from '../repositories/dictionary';
import { DictionaryDeleteConflict } from '../types/services';
import { createCloudStorage } from '../services/cloud-storage';

function repositoryDriver(options: { missing?: boolean; shared?: boolean; failDelete?: boolean } = {}) {
    const events: string[] = [];
    const fileID = 'cloud://env.bucket/dictionaries/phrase/example/hash.json';
    const connection = {
        async query({ sql }: { sql: string }, values: unknown[] = []) {
            events.push(sql);
            if (sql.startsWith('select')) {
                assert.match(sql, /for update$/);
                if (sql.includes('where `dictionaries`.`id`')) {
                    assert.deepEqual(values, ['example']);
                    return [options.missing ? [] : [['example', fileID]], []];
                }
                assert.deepEqual(values, [fileID]);
                return [options.shared ? [['example'], ['other']] : [['example']], []];
            }
            if (sql.startsWith('delete')) {
                assert.deepEqual(values, ['example']);
                if (options.failDelete) throw new Error('database failed');
            }
            return [{ affectedRows: 1 }, []];
        },
        release() {},
    };
    const repo = createDictionaryRepository({
        ...connection,
        async getConnection() {
            return connection;
        },
    } as any);
    return { repo, events, fileID };
}

test('持锁先删文件再删记录，草稿和已归档题库同样可删除', async () => {
    const { repo, events, fileID } = repositoryDriver();
    assert.equal(
        await repo.remove('example', async (id) => {
            assert.equal(id, fileID);
            events.push('cos-delete');
        }),
        true,
    );
    assert.ok(events.indexOf('cos-delete') < events.findIndex((sql) => sql.startsWith('delete')));
    assert.equal(events.at(-1), 'commit');
});

test('不存在和共享文件不触发 COS 删除', async () => {
    const missing = repositoryDriver({ missing: true });
    assert.equal(await missing.repo.remove('example', async () => assert.fail('不应删除')), false);
    const shared = repositoryDriver({ shared: true });
    await assert.rejects(
        shared.repo.remove('example', async () => assert.fail('不应删除')),
        DictionaryDeleteConflict,
    );
    assert.equal(shared.events.at(-1), 'rollback');
});

test('COS 失败保留记录；DB 删除失败回滚，下一次可重试', async () => {
    const storageFailure = repositoryDriver();
    await assert.rejects(
        storageFailure.repo.remove('example', async () => {
            throw new Error('cos denied');
        }),
        /cos denied/,
    );
    assert.ok(!storageFailure.events.some((sql) => sql.startsWith('delete')));
    assert.equal(storageFailure.events.at(-1), 'rollback');
    const options = { failDelete: true };
    const dbFailure = repositoryDriver(options);
    await assert.rejects(
        dbFailure.repo.remove('example', async () => {}),
        (error: any) => error.cause?.message === 'database failed',
    );
    assert.equal(dbFailure.events.at(-1), 'rollback');
    options.failDelete = false;
    assert.equal(await dbFailure.repo.remove('example', async () => {}), true);
    assert.equal(dbFailure.events.at(-1), 'commit');
});

function storageDriver(pages: any[], failVersion?: string) {
    const deleted: any[] = [];
    const listed: any[] = [];
    const storage = createCloudStorage(
        { WX_CLOUD_ENV_ID: 'env', COS_BUCKET: 'bucket' },
        {
            async fetch() {
                return Response.json({
                    TmpSecretId: 'id',
                    TmpSecretKey: 'key',
                    Token: 'token',
                    ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
                });
            },
            createCos: () =>
                ({
                    async listObjectVersions(options: unknown) {
                        listed.push(options);
                        return pages.shift() || { statusCode: 200, IsTruncated: 'false' };
                    },
                    async deleteObject(options: any) {
                        if (options.VersionId === failVersion && failVersion) throw new Error('cos denied');
                        deleted.push(options);
                        return { statusCode: 204 };
                    },
                    async getObject() {
                        throw new Error('不应下载');
                    },
                    async putObject() {
                        throw new Error('不应上传');
                    },
                }) as any,
        },
    );
    return { storage, deleted, listed };
}

const key = 'dictionaries/phrase/example/hash.json';
const fileID = `cloud://env.bucket/${key}`;

test('精确删除文件所有版本和删除标记，不删除相同前缀的其他文件', async () => {
    const { storage, deleted, listed } = storageDriver([
        {
            statusCode: 200,
            IsTruncated: 'true',
            NextKeyMarker: key,
            NextVersionIdMarker: 'v1',
            Versions: [{ Key: key, VersionId: 'v1' }],
        },
        {
            statusCode: 200,
            IsTruncated: 'false',
            Versions: [
                { Key: key, VersionId: 'null' },
                { Key: key + '.backup', VersionId: 'other' },
            ],
            DeleteMarkers: [{ Key: key, VersionId: 'marker' }],
        },
    ]);
    await storage.deleteFile(fileID);
    assert.equal(listed[1].KeyMarker, key);
    assert.equal(listed[1].VersionIdMarker, 'v1');
    assert.deepEqual(
        deleted.map((row) => [row.Key, row.VersionId]),
        [
            [key, 'v1'],
            [key, 'null'],
            [key, 'marker'],
        ],
    );
});

test('无版本文件与缺失文件可删除或重试，越界文件在联网前拒绝', async () => {
    const { storage, deleted, listed } = storageDriver([
        { statusCode: 200, IsTruncated: 'false', Versions: [{ Key: key, VersionId: '' }] },
    ]);
    await storage.deleteFile(fileID);
    await storage.deleteFile(fileID);
    assert.equal(deleted.length, 1);
    assert.equal(deleted[0].VersionId, undefined);
    await assert.rejects(storage.deleteFile(`cloud://other.bucket/${key}`));
    await assert.rejects(storage.deleteFile('cloud://env.bucket/dictionaries/../image.json'));
    await assert.rejects(storage.deleteFile('cloud://env.bucket/images/photo.png'));
    assert.equal(listed.length, 2);
});

test('存储失败和无进展分页不得报告删除成功', async () => {
    const failure = storageDriver(
        [{ statusCode: 200, IsTruncated: 'false', Versions: [{ Key: key, VersionId: 'v1' }] }],
        'v1',
    );
    await assert.rejects(failure.storage.deleteFile(fileID), /cos denied/);
    const page = { statusCode: 200, IsTruncated: 'true', NextKeyMarker: key, NextVersionIdMarker: 'v1' };
    const stuck = storageDriver([page, page]);
    await assert.rejects(stuck.storage.deleteFile(fileID), /分页无效/);
    assert.equal(stuck.deleted.length, 0);
});
