/** 云存储文件服务，不负责 MySQL 题库资料。 */
import * as cloudbase from '@cloudbase/node-sdk';

/** 检查 SDK 返回的业务错误。 */
function check(result: any) {
    if (result?.code && result.code !== 0 && result.code !== '0') {
        throw new Error(String(result.message || result.code));
    }
    if (result?.error) {
        throw new Error(String(result.error.message || result.error));
    }
    return result;
}

/** 创建云存储服务供路由注入，凭据由运行环境提供。 */
export function createCloudStorage() {
    const cloud = cloudbase.init({env: process.env.CLOUDBASE_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV});
    return {
        /** 上传 JSON 并返回真实云文件 ID。 */
        async upload(cloudPath: string, bytes: Buffer): Promise<string> {
            const result = check(await cloud.uploadFile({cloudPath, fileContent: bytes}));
            if (typeof result.fileID !== 'string' || !result.fileID.startsWith('cloud://')) {
                throw new Error('云存储未返回有效文件 ID');
            }
            return result.fileID;
        },
        /** 根据数据库登记的文件 ID 下载内容。 */
        async download(fileID: string): Promise<Buffer> {
            const result = check(await cloud.downloadFile({fileID}));
            if (!Buffer.isBuffer(result.fileContent)) {
                throw new Error('云存储文件内容无效');
            }
            return result.fileContent;
        },
    };
}
