/** 受控账号维护命令：首次初始化超级管理员，或重置指定账号密码；密码不回显、不写日志。 */
import type { PoolConnection } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, lt } from 'drizzle-orm';
import { createDatabasePool } from '../src/db/mysql';
import { adminUsers, adminSessions, adminAuthLimits } from '../src/db/schema';
import { hashPassword } from '../src/auth/crypto';
import { UsernameSchema, PasswordSchema } from '../src/routes/auth';

/** 必须在交互终端输入密码，避免命令行参数、shell 历史和环境变量留下明文。 */
async function readPassword(prompt: string): Promise<string> {
    if (!process.stdin.isTTY) {
        throw new Error('请在交互终端运行账号命令');
    }
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    return new Promise((resolve, reject) => {
        let input = '';
        const finish = () => {
            process.stdin.off('data', onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');
        };
        const onData = (chunk: string) => {
            for (const char of chunk) {
                if (char === '\u0003' || char === '\u0004') {
                    finish();
                    reject(new Error('操作已取消'));
                    return;
                }
                if (char === '\r' || char === '\n') {
                    finish();
                    resolve(input);
                    return;
                }
                if (char === '\u007f' || char === '\b') {
                    input = [...input].slice(0, -1).join('');
                }
                else if (char >= ' ') {
                    input += char;
                }
            }
        };
        process.stdin.on('data', onData);
    });
}

async function main() {
    const [action, usernameInput] = process.argv.slice(2);
    if (!['init', 'reset-password', 'cleanup'].includes(action)) {
        throw new Error('用法：admin:init -- <用户名> / admin:reset-password -- <用户名> / admin:cleanup');
    }
    const username = action === 'cleanup' ? '' : UsernameSchema.parse(usernameInput);
    let passwordHash = '';
    if (action !== 'cleanup') {
        const password = PasswordSchema.parse(await readPassword('请输入密码（6–128 字符，不回显）：'));
        if (password !== await readPassword('请再次输入密码：')) {
            throw new Error('两次密码不一致');
        }
        passwordHash = await hashPassword(password);
    }
    const pool = createDatabasePool();
    let connection: PoolConnection | undefined;
    try {
        connection = await pool.getConnection();
        const db = drizzle(connection);
        if (action === 'cleanup') {
            const now = new Date();
            await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
            await db.delete(adminAuthLimits).where(lt(adminAuthLimits.expiresAt, now));
            console.log('已清理过期会话与限流计数');
            return;
        }
        // 同一连接持有命名锁，避免两个初始化进程同时创建首个超级管理员。
        const [rows] = await connection.query<any[]>("SELECT GET_LOCK('sentleap_admin_init', 10) AS acquired");
        if (rows[0].acquired !== 1) {
            throw new Error('账号维护锁忙，请稍后重试');
        }
        try {
            await db.transaction(async (tx) => {
                const now = new Date();
                if (action === 'init') {
                    const existing = await tx.select().from(adminUsers).where(eq(adminUsers.role, 'super_admin')).for('update');
                    if (existing.length) {
                        throw new Error('超级管理员已存在，拒绝重复初始化');
                    }
                    await tx.insert(adminUsers).values({
                        id: randomUUID(),
                        username,
                        nickname: username,
                        passwordHash,
                        role: 'super_admin',
                        status: 'active',
                        createdAt: now,
                        updatedAt: now
                    });
                }
                else {
                    const [user] = await tx.select().from(adminUsers).where(eq(adminUsers.username, username)).for('update');
                    if (!user) {
                        throw new Error('账号不存在');
                    }
                    await tx.update(adminUsers).set({ passwordHash, updatedAt: now }).where(eq(adminUsers.id, user.id));
                    await tx.update(adminSessions).set({ revokedAt: now }).where(eq(adminSessions.userId, user.id));
                }
            });
        }
        finally {
            await connection.query("SELECT RELEASE_LOCK('sentleap_admin_init')");
        }
        console.log(action === 'init' ? '超级管理员已创建' : '密码已重置，全部会话已撤销');
    }
    finally {
        connection?.release();
        await pool.end();
    }
}

main().catch(() => {
    // 数据库/校验异常可能含敏感输入；命令不直接打印原始异常。
    console.error('账号维护失败：请检查参数、两次密码、数据库迁移及账号是否已存在；初始化只允许执行一次。');
    process.exitCode = 1;
});
