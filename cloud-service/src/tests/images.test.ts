/** 验证图片登录上传、文件签名、大小限制和独立存储路径。 */
import { authFixture, testHeaders } from './auth-fixture';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createApp } from '../app';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64');

test('图片登录后可上传，传递内容类型且不写入题库', async () => {
    const uploads: string[] = [];
    const app = createApp({
        auth: authFixture().repo,
        async list() { return []; },
        async get() { return undefined; },
        async download() { return Buffer.alloc(0); },
        async pronounce() { return { ok: false }; },
        async create() { assert.fail('图片不应登记题库'); },
        async upload(path, bytes, contentType) {
            assert.match(path, /^images\/test\/[a-f0-9-]+\.png$/);
            assert.deepEqual(bytes, png);
            assert.equal(contentType, 'image/png');
            uploads.push(path);
            return `cloud://test.bucket/${path}`;
        },
    });
    // 使用伪造文件名和 MIME，验证以字节签名确定类型和服务端存储路径。
    const request = (bytes: Buffer) => {
        const form = new FormData();
        form.set('file', new Blob([new Uint8Array(bytes)], { type: 'text/plain' }), '../../test.txt');
        return app.request('/api/admin/upload-image', {
            method: 'POST',
            headers: testHeaders,
            body: form,
        });
    };
    const document = await (await app.request('/openapi.json')).json() as any;
    assert.ok(document.paths['/api/admin/upload-image'].post.security);
    assert.equal((await request(Buffer.from('not an image'))).status, 415);
    assert.equal((await request(Buffer.alloc(5 * 1024 * 1024))).status, 413);
    const response = await request(png);
    assert.equal(response.status, 201);
    const body = await response.json() as any;
    assert.equal(body.contentType, 'image/png');
    assert.equal(body.size, png.length);
    assert.equal(body.fileID, `cloud://test.bucket/${uploads[0]}`);
    await request(png);
    assert.equal(uploads.length, 2);
    assert.notEqual(uploads[0], uploads[1]);
});
