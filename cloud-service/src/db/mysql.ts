/** MySQL 连接池及题库资料读写；文件内容仍保存在云存储。 */
import { createPool, type Pool, type PoolOptions } from 'mysql2/promise';
/** 从服务端环境变量创建连接池，不在源码中保存数据库密码。 */
export function getDatabaseOptions(env = process.env): PoolOptions {
    const address = env.MYSQL_ADDRESS?.split(':');
    const host = env.MYSQL_HOST || address?.[0];
    const port = Number(env.MYSQL_PORT || address?.[1] || 3306);
    const user = env.MYSQL_USERNAME || env.MYSQL_USER;
    if (!host || !user || !env.MYSQL_PASSWORD || !env.MYSQL_DATABASE) {
        throw new Error('请配置 MYSQL_HOST（或 MYSQL_ADDRESS）、MYSQL_USERNAME、MYSQL_PASSWORD、MYSQL_DATABASE');
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('MYSQL_PORT 无效');
    }
    return {
        host,
        port,
        user,
        password: env.MYSQL_PASSWORD,
        database: env.MYSQL_DATABASE,
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 100,
        connectTimeout: 10000,
        ...(env.MYSQL_SSL_CA ? { ssl: { ca: env.MYSQL_SSL_CA, rejectUnauthorized: true } } : {}),
    };
}

/** 从服务端环境变量创建连接池。 */
export function createDatabasePool(env = process.env): Pool {
    return createPool(getDatabaseOptions(env));
}
