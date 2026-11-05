/** 云托管服务入口：连接云开发数据库、存储和发音服务。 */
import { serve } from '@hono/node-server';
import * as cloudbase from '@cloudbase/node-sdk';
import { createApp, type Dictionary } from './app';
import { main as pronounce } from './pronunciation';

const cloud = cloudbase.init({ env: process.env.CLOUDBASE_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV });
const collection = cloud.database().collection('dictionaries');

/** 检查云开发 SDK 返回的业务错误。 */
function check(result: any) {
  if (result?.code && result.code !== 0 && result.code !== '0') throw new Error(String(result.message || result.code));
  if (result?.error) throw new Error(String(result.error.message || result.error));
  return result;
}

const app = createApp({
  // 分页读取全部记录，避免只返回数据库默认页的题库。
  async list() {
    const rows: Dictionary[] = [];
    for (let offset = 0; ; offset += 100) {
      const result = check(await collection.orderBy('_id', 'asc').skip(offset).limit(100).get());
      const page = result.data || [];
      rows.push(...page);
      if (page.length < 100) return rows;
    }
  },
  // 文档 ID 与上传脚本的题库 ID 一致。
  async get(id) {
    const result = check(await collection.doc(id).get());
    return Array.isArray(result.data) ? result.data[0] : result.data;
  },
  // 通过云存储返回的 fileID 读取 JSON 文件。
  async download(fileID) {
    const result = check(await cloud.downloadFile({ fileID }));
    if (!Buffer.isBuffer(result.fileContent)) throw new Error('云存储文件内容无效');
    return result.fileContent;
  },
  pronounce,
});

serve({ fetch: app.fetch, port: Number(process.env.PORT || 8080), hostname: '0.0.0.0' });
