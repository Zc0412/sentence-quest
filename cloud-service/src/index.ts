/** 云托管服务入口：连接 MySQL、云存储和发音服务。 */
import {networkInterfaces} from 'node:os';
import {serve} from '@hono/node-server';
import {createCloudStorage} from './services/cloud-storage';
import {createApp} from './app';
import {createDatabasePool} from './db/mysql';
import {createDictionaryRepository} from './repositories/dictionary';
import {main as pronounce} from './services/pronunciation';

// 标识当前存储实现和临时鉴权状态，便于核对部署版本；不代表数据库已连通。
console.log('[SentLeap] 部署标识：mysql-cos-admin-open-20261107-r2；题库元数据：MySQL；题库文件：COS；admin 接口：暂不鉴权');

const database = createDatabasePool();
const dictionaries = createDictionaryRepository(database);

const app = createApp({
    // 保留令牌配置供后续恢复鉴权使用；当前管理员路由不验证令牌。
    adminToken: process.env.DICTIONARY_ADMIN_TOKEN,
    ...createCloudStorage(),
    ...dictionaries,
    pronounce,
});

serve(
    {
        fetch: app.fetch,
        port: Number(process.env.PORT || 8080),
        hostname: '0.0.0.0',
    },
    // 监听成功后打印实际端口与网卡地址；容器 IP 不代表公网入口。
    (info) => {
        console.log(`[SentLeap] 服务已启动，监听地址：http://${info.address}:${info.port}`);

        for (const addresses of Object.values(networkInterfaces())) {
            for (const address of addresses || []) {
                if (address.family === 'IPv4' && !address.internal) {
                    console.log(`[SentLeap] 本机/容器 IP：http://${address.address}:${info.port}`);
                }
            }
        }
    },
);
