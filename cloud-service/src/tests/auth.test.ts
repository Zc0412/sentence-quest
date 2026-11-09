/** 验证后台权限、邀请注册、会话撤销、CSRF 和限流；公开查询不受登录约束。 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createApp } from '../app';
import { hashPassword, hashToken, verifyPassword } from '../auth/crypto';
import { authFixture, testHeaders, testToken } from './auth-fixture';

const password = 'a-strong-password-123';

const origin = 'https://admin.example.test';

function setup() {
    const fixture = authFixture();
    let writes = 0;
    const app = createApp({
        auth: fixture.repo,
        authConfig: {
            sessionDays: 7,
            secureCookie: true,
            allowedOrigins: [origin]
        },
        async list() { return []; },
        async get() { return undefined; },
        async download() { return Buffer.from('[]'); },
        async pronounce() { return { ok: false }; },
        async upload() { writes++; return 'file'; },
        async create() { writes++; },
        async update() { writes++; return true; },
    });
    const request = (path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => app.request(path, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return {
        ...fixture,
        app,
        request,
        writes: () => writes
    };
}

test('全部后台写操作先鉴权，公开目录和内容查询不要求登录', async () => {
    const { request, writes } = setup();
    for (const [path, method] of [
        ['/api/admin/dictionaries', 'POST'], ['/api/admin/upload-dictionary', 'POST'],
        ['/api/admin/upload-image', 'POST'], ['/api/admin/dictionaries/test', 'PUT'],
        ['/api/admin/dictionaries/test', 'DELETE'], ['/api/admin/users', 'GET'],
    ]) {
        assert.equal((await request(path, method)).status, 401, path);
    }
    assert.equal(writes(), 0);
    assert.equal((await request('/api/dictionaries')).status, 200);
    assert.equal((await request('/api/dictionaries/missing/content')).status, 404);
});

test('邀请注册、重复消费、大小写用户名、登录 Cookie 和普通管理员权限', async () => {
    const { request, invites, users } = setup();
    const inviteResponse = await request('/api/admin/invites', 'POST', {}, testHeaders);
    assert.equal(inviteResponse.status, 201);
    const invite = await inviteResponse.json() as any;
    assert.ok(invites.has(hashToken(invite.inviteCode)));
    assert.ok(!JSON.stringify([...invites.values()]).includes(invite.inviteCode));
    const input = {
        username: 'Editor',
        password,
        nickname: '编辑',
        inviteCode: invite.inviteCode
    };
    assert.equal((await request('/api/admin/auth/register', 'POST', { ...input, role: 'super_admin' })).status, 400);
    const registered = await request('/api/admin/auth/register', 'POST', input);
    assert.equal(registered.status, 201);
    const { user } = await registered.json() as any;
    assert.equal(user.username, 'editor');
    assert.equal(user.role, 'admin');
    assert.equal(user.passwordHash, undefined);
    assert.equal((await request('/api/admin/auth/register', 'POST', { ...input, username: 'other' })).status, 400);
    const login = await request('/api/admin/auth/login', 'POST', { username: 'EDITOR', password });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(login.headers.get('set-cookie')!, /Secure/);
    assert.match(login.headers.get('set-cookie')!, /SameSite=Lax/i);
    const { token } = await login.json() as any;
    const headers = { Authorization: `Bearer ${token}` };
    assert.equal((await request('/api/admin/auth/me', 'GET', undefined, headers)).status, 200);
    assert.equal((await request('/api/admin/invites', 'POST', {}, headers)).status, 403);
    assert.equal((await request('/api/admin/users', 'GET', undefined, headers)).status, 403);
    assert.equal((await request(`/api/admin/users/${user.id}/status`, 'PATCH', { status: 'disabled' }, headers)).status, 403);
    const disabled = await request(`/api/admin/users/${user.id}/status`, 'PATCH', { status: 'disabled' }, testHeaders);
    assert.equal(disabled.status, 200);
    assert.equal(users.get(user.id)!.status, 'disabled');
    assert.equal((await request('/api/admin/auth/me', 'GET', undefined, headers)).status, 401);
    assert.equal((await request('/api/admin/auth/login', 'POST', { username: 'editor', password })).status, 401);
    await request(`/api/admin/users/${user.id}/status`, 'PATCH', { status: 'active' }, testHeaders);
    assert.equal((await request('/api/admin/auth/me', 'GET', undefined, headers)).status, 401);
});

test('Cookie 写请求需可信 Origin；登录也拒绝跨站来源，Bearer 支持脚本', async () => {
    const { request } = setup();
    const cookie = { Cookie: `sentleap_admin=${testToken}` };
    assert.equal((await request('/api/admin/auth/me', 'GET', undefined, cookie)).status, 200);
    assert.equal((await request('/api/admin/invites', 'POST', {}, cookie)).status, 403);
    assert.equal((await request('/api/admin/invites', 'POST', {}, { ...cookie, Origin: 'https://evil.test' })).status, 403);
    assert.equal((await request('/api/admin/invites', 'POST', {}, { ...cookie, Origin: origin })).status, 201);
    assert.equal((await request('/api/admin/auth/login', 'POST', { username: 'root', password }, { Origin: 'null' })).status, 403);
    assert.equal((await request('/api/admin/invites', 'POST', {}, testHeaders)).status, 201);
});

test('密码校验、改密撤销全部会话、退出和过期会话', async () => {
    const { request, root, sessions } = setup();
    root.passwordHash = await hashPassword(password);
    assert.equal(await verifyPassword(password, root.passwordHash), true);
    assert.equal(await verifyPassword('wrong-password', root.passwordHash), false);
    const login = async (pass = password) => request('/api/admin/auth/login', 'POST', { username: 'root', password: pass });
    assert.equal((await login('wrong-password')).status, 401);
    const first = await (await login()).json() as any;
    const second = await (await login()).json() as any;
    assert.notEqual(first.token, second.token);
    const headers = { Authorization: `Bearer ${first.token}` };
    assert.equal((await request('/api/admin/auth/password', 'PUT', { oldPassword: 'wrong-password', newPassword: 'new-password-123' }, headers)).status, 400);
    assert.equal((await request('/api/admin/auth/password', 'PUT', { oldPassword: password, newPassword: 'new-password-123' }, headers)).status, 200);
    for (const token of [first.token, second.token, testToken]) {
        assert.equal((await request('/api/admin/auth/me', 'GET', undefined, { Authorization: `Bearer ${token}` })).status, 401);
    }
    assert.equal((await login()).status, 401);
    const third = await (await login('new-password-123')).json() as any;
    const thirdHeaders = { Authorization: `Bearer ${third.token}` };
    assert.equal((await request('/api/admin/auth/logout', 'POST', undefined, thirdHeaders)).status, 200);
    assert.equal((await request('/api/admin/auth/me', 'GET', undefined, thirdHeaders)).status, 401);
    const fourth = await (await login('new-password-123')).json() as any;
    sessions.get(hashToken(fourth.token))!.expiresAt = new Date(0);
    assert.equal((await request('/api/admin/auth/me', 'GET', undefined, { Authorization: `Bearer ${fourth.token}` })).status, 401);
});

test('邀请撤销和过期不可注册，不能禁用自身，敏感字段不出现在账号列表', async () => {
    const { request, root, invites } = setup();
    root.passwordHash = 'never-expose-me';
    assert.equal((await request(`/api/admin/users/${root.id}/status`, 'PATCH', { status: 'disabled' }, testHeaders)).status, 409);
    const list = await request('/api/admin/users', 'GET', undefined, testHeaders);
    assert.equal(list.status, 200);
    assert.ok(!(await list.text()).includes(root.passwordHash));
    for (const mode of ['revoked', 'expired']) {
        const invite = await (await request('/api/admin/invites', 'POST', {}, testHeaders)).json() as any;
        if (mode === 'revoked') {
            assert.equal((await request(`/api/admin/invites/${invite.id}`, 'DELETE', undefined, testHeaders)).status, 200);
        }
        else {
            invites.get(hashToken(invite.inviteCode))!.expiresAt = new Date(0);
        }
        assert.equal((await request('/api/admin/auth/register', 'POST', {
            username: 'editor',
            password,
            nickname: '编辑',
            inviteCode: invite.inviteCode,
        })).status, 400);
    }
});

test('登录次数超限返回 429，不泄漏账号是否存在', async () => {
    const { request } = setup();
    for (let i = 0; i < 10; i++) {
        const response = await request('/api/admin/auth/login', 'POST', { username: 'missing', password });
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: '用户名或密码错误' });
    }
    assert.equal((await request('/api/admin/auth/login', 'POST', { username: 'missing', password })).status, 429);
});


test('注册拒绝不足六位密码，六位密码可注册、登录和改密', async () => {
    const { request } = setup();
    const inviteResponse = await request('/api/admin/invites', 'POST', {}, testHeaders);
    assert.equal(inviteResponse.status, 201);
    const { inviteCode } = await inviteResponse.json() as { inviteCode: string };
    const registration = {
        username: 'six_chars',
        nickname: '六位密码用户',
        inviteCode,
        password: '12345',
    };
    assert.equal((await request('/api/admin/auth/register', 'POST', registration)).status, 400);
    registration.password = '123456';
    assert.equal((await request('/api/admin/auth/register', 'POST', registration)).status, 201);

    const login = await request('/api/admin/auth/login', 'POST', {
        username: registration.username,
        password: registration.password,
    });
    assert.equal(login.status, 200);
    const { token } = await login.json() as { token: string };
    const headers = { Authorization: `Bearer ${token}` };
    assert.equal((await request('/api/admin/auth/password', 'PUT', {
        oldPassword: '123456',
        newPassword: 'abcde',
    }, headers)).status, 400);
    assert.equal((await request('/api/admin/auth/password', 'PUT', {
        oldPassword: '123456',
        newPassword: 'abcdef',
    }, headers)).status, 200);
    assert.equal((await request('/api/admin/auth/login', 'POST', {
        username: registration.username,
        password: 'abcdef',
    })).status, 200);
});
