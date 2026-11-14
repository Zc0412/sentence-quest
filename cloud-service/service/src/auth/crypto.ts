/** 密码使用异步 scrypt，随机令牌仅以 SHA-256 哈希写入数据库。 */
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

export const newToken = () => randomBytes(32).toString('base64url');

function derive(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, {
            N: 32768,
            r: 8,
            p: 3,
            maxmem: 64 * 1024 * 1024
        }, (error, key) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(key);
            }
        });
    });
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    return `scrypt$32768$8$3$${salt}$${(await derive(password, salt)).toString('hex')}`;
}

/** 不存在的账号也执行同等成本的校验，减少账号枚举时序差异。 */
export async function verifyPassword(password: string, stored?: string): Promise<boolean> {
    const parts = (stored || '').split('$');
    const valid = parts.length === 6 && parts.slice(0, 4).join('$') === 'scrypt$32768$8$3'
        && /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{128}$/.test(parts[5]);
    const actual = await derive(password, valid ? parts[4] : '0'.repeat(32));
    const expected = Buffer.from(valid ? parts[5] : '0'.repeat(128), 'hex');
    return timingSafeEqual(actual, expected) && valid;
}
