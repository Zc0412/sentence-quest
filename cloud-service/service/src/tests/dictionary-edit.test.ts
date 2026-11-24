/** 验证单条编辑的身份保护、版本冲突与失败保留原引用。 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createApp } from '../app';
import { authFixture, testHeaders } from './auth-fixture';
import { editEntry } from '../utils/edit-entry';
import type { Dictionary } from '../types/services';

const dictionary: Dictionary = {
    id: 'test',
    label: '测试',
    kind: 'word',
    category: '单词',
    wordCount: 1,
    sha256: 'a'.repeat(64),
    fileID: 'old',
    status: 'published',
};
const original = [{ name: 'cat', trans: ['猫'], usphone: 'kæt' }];

test('固定索引编辑保持身份、长度和未知字段；拒绝重命名与越界', () => {
    const changed = { ...original[0], trans: ['猫咪'] };
    assert.deepEqual(editEntry(original, dictionary, 0, changed), [changed]);
    assert.equal(original[0].trans[0], '猫');
    assert.throws(() => editEntry(original, dictionary, 0, { ...changed, name: 'dog' }));
    assert.throws(() => editEntry(original, dictionary, 1, changed));
    assert.throws(() => editEntry(original, dictionary, 0, { ...changed, trans: [] }));
    const phrase = { id: 'p1', english: 'go home', zh: '回家', words: ['go', 'home'] };
    assert.throws(() => editEntry([phrase], { ...dictionary, kind: 'phrase' }, 0, { ...phrase, id: 'p2' }));
    assert.equal(editEntry([phrase], { ...dictionary, kind: 'phrase' }, 0, { ...phrase, zh: '回家去' }).length, 1);
});

for (const mode of ['success', 'stale', 'race', 'upload-failure'] as const) {
    test(`编辑接口：${mode}`, async () => {
        let current = { ...dictionary };
        let uploads = 0;
        let updates = 0;
        const app = createApp({
            auth: authFixture().repo,
            async list() {
                return [current];
            },
            async get() {
                return current;
            },
            async download() {
                return Buffer.from(JSON.stringify(original));
            },
            async pronounce() {
                return { ok: false };
            },
            async upload(path, bytes) {
                uploads++;
                assert.match(path, /^dictionaries\/word\/test\/[a-f0-9]{64}\.json$/);
                assert.equal(JSON.parse(bytes.toString())[0].trans[0], '猫咪');
                if (mode === 'upload-failure') throw new Error('模拟上传失败');
                return 'new';
            },
            async update(id, fields, version) {
                updates++;
                assert.equal(version, dictionary.sha256);
                assert.equal(fields.status, undefined);
                if (mode === 'race') return false;
                current = { ...current, ...fields };
                return true;
            },
        });
        const response = await app.request('/api/admin/dictionaries/test', {
            method: 'PUT',
            headers: { ...testHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                edit: {
                    version: (mode === 'stale' ? 'b' : 'a').repeat(64),
                    index: 0,
                    entry: { ...original[0], trans: ['猫咪'] },
                },
            }),
        });
        assert.equal(response.status, mode === 'success' ? 200 : mode === 'upload-failure' ? 500 : 409);
        assert.equal(uploads, mode === 'stale' ? 0 : 1);
        assert.equal(updates, ['stale', 'upload-failure'].includes(mode) ? 0 : 1);
        assert.equal(current.fileID, mode === 'success' ? 'new' : 'old');
        if (mode === 'success') assert.notEqual(current.sha256, dictionary.sha256);
    });
}
