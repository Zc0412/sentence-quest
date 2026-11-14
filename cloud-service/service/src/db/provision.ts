/** 创建目标 MySQL 数据库；初始化账号需具备 CREATE DATABASE 权限。 */
import type {Connection} from 'mysql2/promise';

/** 创建不存在的数据库，使用转义标识符避免数据库名被解释为 SQL。 */
export async function createDatabaseIfMissing(connection: Pick<Connection, 'query'>, database: string): Promise<void> {
    if (!database || database.length > 64) {
        throw new Error('MYSQL_DATABASE 必须为 1 到 64 个字符');
    }

    const escapedDatabase = database.replace(/`/g, '``');
    await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${escapedDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
}
