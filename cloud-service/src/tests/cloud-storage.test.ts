/** 验证云托管 COS 临时密钥、文件元数据与 cloudID 路径处理。 */
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import type COS from 'cos-nodejs-sdk-v5';
import {createCloudStorage} from '../services/cloud-storage';

const environment = {
    WX_CLOUD_ENV_ID: 'wxrun-test',
    COS_BUCKET: 'bucket-test',
    COS_REGION: 'ap-shanghai',
};

/** 构造 JSON HTTP 响应，避免测试依赖真实云托管开放接口。 */
function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: {'content-type': 'application/json'},
    });
}

test('缺少云托管环境或存储桶配置时明确报错', () => {
    assert.throws(() => createCloudStorage({}), /WX_CLOUD_ENV_ID 和 COS_BUCKET/);
});

test('上传通过 COS 写入对象元数据并生成云托管 cloudID', async () => {
    const calls: {url: string; init?: RequestInit}[] = [];
    let putOptions: COS.PutObjectParams | undefined;
    let cosOptions: COS.COSOptions | undefined;
    let authorization: COS.GetAuthorizationCallbackParams | undefined;
    const storage = createCloudStorage(environment, {
        async fetch(url, init) {
            calls.push({url, init});
            if (url.endsWith('/getauth')) {
                return jsonResponse({
                    TmpSecretId: 'temporary-id',
                    TmpSecretKey: 'temporary-key',
                    Token: 'temporary-token',
                    ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
                });
            }
            return jsonResponse({
                errcode: 0,
                respdata: {x_cos_meta_field_strs: ['signed-file-metadata']},
            });
        },
        createCos(options) {
            cosOptions = options;
            options.getAuthorization?.({} as COS.GetAuthorizationOptions, (credentials) => {
                authorization = credentials;
            });
            return {
                async getObject() {
                    return {statusCode: 200, Body: Buffer.alloc(0)};
                },
                async putObject(options) {
                    putOptions = options;
                    return {statusCode: 200};
                },
            };
        },
    });
    const bytes = Buffer.from('[{"name":"cat","trans":["n. 猫"]}]');
    const fileID = await storage.upload('dictionaries/word/cet4/hash.json', bytes);

    assert.equal(fileID, 'cloud://wxrun-test.bucket-test/dictionaries/word/cet4/hash.json');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'http://api.weixin.qq.com/_/cos/metaid/encode');
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
        openid: '',
        bucket: 'bucket-test',
        paths: ['dictionaries/word/cet4/hash.json'],
    });
    assert.equal(putOptions?.Bucket, 'bucket-test');
    assert.equal(putOptions?.Region, 'ap-shanghai');
    assert.equal(putOptions?.Key, 'dictionaries/word/cet4/hash.json');
    assert.equal(putOptions?.Body, bytes);
    assert.equal(putOptions?.Headers?.['x-cos-meta-fileid'], 'signed-file-metadata');
    assert.ok(cosOptions?.getAuthorization);
    assert.ok(authorization && typeof authorization !== 'string');
    assert.equal(authorization.TmpSecretId, 'temporary-id');
    assert.equal(authorization.TmpSecretKey, 'temporary-key');
    assert.equal(authorization.SecurityToken, 'temporary-token');
    assert.ok(Number.isInteger(authorization.StartTime));
    assert.ok(Number.isInteger(authorization.ExpiredTime));
});

test('只从当前云托管对象存储下载数据库登记的 cloudID', async () => {
    let getOptions: COS.GetObjectParams | undefined;
    const storage = createCloudStorage(environment, {
        async fetch() {
            return jsonResponse({
                TmpSecretId: 'temporary-id',
                TmpSecretKey: 'temporary-key',
                Token: 'temporary-token',
                ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
            });
        },
        createCos() {
            return {
                async getObject(options) {
                    getOptions = options;
                    return {statusCode: 200, Body: Buffer.from('[]')};
                },
                async putObject() {
                    return {statusCode: 200};
                },
            };
        },
    });
    const file = await storage.download('cloud://wxrun-test.bucket-test/dictionaries/word/cet4/hash.json');
    assert.equal(file.toString('utf8'), '[]');
    assert.equal(getOptions?.Bucket, 'bucket-test');
    assert.equal(getOptions?.Region, 'ap-shanghai');
    assert.equal(getOptions?.Key, 'dictionaries/word/cet4/hash.json');
    await assert.rejects(
        storage.download('cloud://old-cloudbase-env/dictionaries/word/cet4/hash.json'),
        /请重新上传题库/,
    );
});
