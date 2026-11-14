/** 按 .env 配置创建 MySQL 数据库；后续由 Drizzle 执行表迁移。 */
import {createConnection} from 'mysql2/promise';
import {getDatabaseOptions} from '../src/db/mysql';
import {createDatabaseIfMissing} from '../src/db/provision';

const options = getDatabaseOptions();
const {database, ...serverOptions} = options;

/** 创建数据库并确保关闭管理连接。 */
async function main() {
    const connection = await createConnection(serverOptions);
    try {
        await createDatabaseIfMissing(connection, database || '');
        console.log(`MySQL 数据库已确认存在：${database}`);
    }
    catch (error) {
        const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
            ? error.code
            : 'UNKNOWN';
        throw new Error(`创建 MySQL 数据库失败（${code}）。请确认账号有 CREATE DATABASE 权限及数据库名称有效。`, {cause: error});
    }
    finally {
        await connection.end();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : '创建 MySQL 数据库失败');
    process.exitCode = 1;
});
