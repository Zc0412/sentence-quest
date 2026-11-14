/** Drizzle Kit 配置：生成迁移不连数据库，执行迁移时由命令加载 .env。 */
import {defineConfig} from 'drizzle-kit';

const address = process.env.MYSQL_ADDRESS?.split(':');
export default defineConfig({
    dialect: 'mysql',
    schema: './src/db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        host: process.env.MYSQL_HOST || address?.[0] || 'localhost',
        port: Number(process.env.MYSQL_PORT || address?.[1] || 3306),
        user: process.env.MYSQL_USERNAME || process.env.MYSQL_USER || '',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || '',
        ...(process.env.MYSQL_SSL_CA ? {ssl: {ca: process.env.MYSQL_SSL_CA, rejectUnauthorized: true}} : {}),
    },
});
