/** 云托管服务入口：连接 MySQL、云存储和发音服务。 */
import {networkInterfaces} from 'node:os';
import {serve} from '@hono/node-server';
import {createCloudStorage} from './services/cloud-storage';
import {createApp} from './app';
import {createDatabasePool} from './db/mysql';
import {createDictionaryRepository} from './repositories/dictionary';
import {main as pronounce} from './services/pronunciation';

const database = createDatabasePool();
const dictionaries = createDictionaryRepository(database);

const app = createApp({
    // 管理令牌只从容器环境变量读取，不发送给普通小程序用户。
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
