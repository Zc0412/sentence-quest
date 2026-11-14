/** 通过模拟驱动验证真实仓储的事务回滚和并发保护条件，不连接云数据库。 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createAdminRepository } from '../repositories/admin';
import { authFixture } from './auth-fixture';
import { AuthError } from '../auth/types';

function driver(selectRows: unknown[][], failInsert = false) {
    const calls: {
        sql: string;
        values: unknown[];
    }[] = [];
    const connection = {
        async query(options: {
            sql: string;
        }, values: unknown[] = []) {
            const sql = options.sql;
            calls.push({ sql, values });
            if (failInsert && sql.startsWith('insert into `admin_users`')) {
                throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
            }
            return sql.startsWith('select') ? [selectRows, []] : [{ affectedRows: 1 }, []];
        },
        release() { },
    };
    const repo = createAdminRepository({ async getConnection() { return connection; }, ...connection } as any);
    return { repo, calls };
}

const date = '2026-01-01 00:00:00.000';

const future = '2099-01-01 00:00:00.000';

test('用户名唯一冲突会回滚注册事务，不消费邀请码', async () => {
    const { root } = authFixture();
    const { repo, calls } = driver([['invite', 'hash', root.id, future, null, null, null, date]], true);
    await assert.rejects(repo.register(root, 'hash'), (error) => error instanceof AuthError && error.status === 409);
    assert.match(calls[1].sql, /for update$/);
    assert.equal(calls.at(-1)!.sql, 'rollback');
    assert.ok(!calls.some((call) => call.sql.startsWith('update `admin_invites`')));
});

test('已消费邀请在持锁检查后拒绝，注册成功才标记使用并提交', async () => {
    const { root } = authFixture();
    const used = driver([['invite', 'hash', root.id, future, root.id, date, null, date]]);
    await assert.rejects(used.repo.register(root, 'hash'), /邀请码无效/);
    assert.equal(used.calls.at(-1)!.sql, 'rollback');
    const available = driver([['invite', 'hash', root.id, future, null, null, null, date]]);
    await available.repo.register(root, 'hash');
    assert.equal(available.calls.at(-1)!.sql, 'commit');
    assert.ok(available.calls.some((call) => call.sql.startsWith('update `admin_invites`')));
});

test('改密原子更新哈希并撤销全部会话，过期密码快照不能登录', async () => {
    const { root } = authFixture();
    const row = [root.id, root.username, 'current-hash', root.nickname, 'super_admin', 'active', null, date, date];
    const { repo, calls } = driver([row]);
    await repo.changePassword(root.id, 'current-hash', 'new-hash');
    assert.ok(calls.some((call) => call.sql.startsWith('update `admin_sessions`') && call.values.includes(root.id)));
    assert.equal(calls.at(-1)!.sql, 'commit');
    await assert.rejects(repo.login({ ...root, passwordHash: 'stale-hash' }, {
        id: 'session',
        userId: root.id,
        tokenHash: 'hash',
        createdAt: new Date(),
        expiresAt: new Date(),
        revokedAt: null,
    }), (error) => error instanceof AuthError && error.status === 401);
    assert.equal(calls.at(-1)!.sql, 'rollback');
    assert.ok(!calls.some((call) => call.sql.startsWith('insert into `admin_sessions`')));
});

test('禁用检查在有序行锁内执行，最后超级管理员及自身不可禁用', async () => {
    const { root } = authFixture();
    const rows = [[root.id, root.username, 'hash', root.nickname, 'super_admin', 'active', null, date, date]];
    const { repo, calls } = driver(rows);
    await assert.rejects(repo.setStatus(root.id, root.id, 'disabled'), (error) => error instanceof AuthError && error.status === 409);
    assert.match(calls[1].sql, /order by .* for update$/);
    assert.equal(calls.at(-1)!.sql, 'rollback');
    const disabled = ['other', 'other', 'hash', '其他管理员', 'super_admin', 'disabled', null, date, date];
    const invalidActor = driver([...rows, disabled]);
    await assert.rejects(invalidActor.repo.setStatus('other', root.id, 'disabled'), (error) => error instanceof AuthError && error.status === 403);
});

test('共享限流原子累加后读取计数，到阈值拒绝', async () => {
    const { repo, calls } = driver([['key', 11, future]]);
    assert.equal(await repo.consumeLimit('key', 10), false);
    assert.match(calls[1].sql, /on duplicate key update/);
    assert.match(calls[2].sql, /for update$/);
    assert.equal(calls.at(-1)!.sql, 'commit');
});
