/** 使用微信云托管开放接口与 COS SDK 读写云托管对象存储。 */
import COS from 'cos-nodejs-sdk-v5';

interface CloudRunCredentials {
    TmpSecretId: string;
    TmpSecretKey: string;
    Token: string;
    ExpiredTime: number;
}

interface StorageEnvironment {
    WX_CLOUD_ENV_ID?: string;
    COS_BUCKET?: string;
    COS_REGION?: string;
}

interface StorageDependencies {
    fetch?: typeof fetch;
    createCos?: (options: COS.COSOptions) => Pick<COS, 'getObject' | 'putObject'>;
}

/** 创建微信云托管对象存储服务；对象存储桶与地域需从云托管控制台配置。 */
export function createCloudStorage(
    env: StorageEnvironment = process.env,
    dependencies: StorageDependencies = {},
) {
    const environmentId = env.WX_CLOUD_ENV_ID;
    const bucket = env.COS_BUCKET;
    const region = env.COS_REGION || 'ap-shanghai';
    const request = dependencies.fetch || fetch;
    const createCos = dependencies.createCos || ((options) => new COS(options));

    if (!environmentId || !bucket) {
        throw new Error('请配置 WX_CLOUD_ENV_ID 和 COS_BUCKET');
    }

    let cachedCredentials: CloudRunCredentials | undefined;
    let credentialsRequest: Promise<CloudRunCredentials> | undefined;

    /** 从云托管开放接口获取并短期缓存 COS 临时密钥。 */
    async function getCredentials(): Promise<CloudRunCredentials> {
        if (cachedCredentials && cachedCredentials.ExpiredTime - Math.floor(Date.now() / 1000) > 60) {
            return cachedCredentials;
        }
        if (!credentialsRequest) {
            credentialsRequest = (async () => {
                const response = await request('http://api.weixin.qq.com/_/cos/getauth');
                if (!response.ok) {
                    throw new Error(`获取云托管 COS 临时密钥失败（HTTP ${response.status}）`);
                }
                const result = await response.json() as Partial<CloudRunCredentials>;
                const expiredTime = Number(result.ExpiredTime);
                if (typeof result.TmpSecretId !== 'string'
                    || typeof result.TmpSecretKey !== 'string'
                    || typeof result.Token !== 'string'
                    || !Number.isInteger(expiredTime)
                    || expiredTime <= Math.floor(Date.now() / 1000)) {
                    throw new Error('云托管 COS 临时密钥响应无效');
                }
                cachedCredentials = {...result, ExpiredTime: expiredTime} as CloudRunCredentials;
                return cachedCredentials;
            })().finally(() => {
                credentialsRequest = undefined;
            });
        }
        return credentialsRequest;
    }

    /** 创建使用本次临时密钥的 COS SDK 客户端。 */
    async function createClient() {
        const credentials = await getCredentials();
        return createCos({
            getAuthorization: (_options, callback) => callback({
                TmpSecretId: credentials.TmpSecretId,
                TmpSecretKey: credentials.TmpSecretKey,
                SecurityToken: credentials.Token,
                StartTime: Math.floor(Date.now() / 1000),
                ExpiredTime: credentials.ExpiredTime,
            }),
        });
    }

    /** 仅接受本服务当前云托管环境和对象存储桶中的 cloudID。 */
    function keyFromFileID(fileID: string): string {
        const prefix = `cloud://${environmentId}.${bucket}/`;
        if (!fileID.startsWith(prefix)) {
            throw new Error('题库文件不属于当前云托管对象存储，请重新上传题库');
        }
        const key = fileID.slice(prefix.length);
        if (!key || key.startsWith('/') || key.split('/').some((part) => !part || part === '.' || part === '..')) {
            throw new Error('云托管对象存储文件路径无效');
        }
        return key;
    }

    /** 请求对象元数据签名，确保小程序可按云托管存储权限访问文件。 */
    async function getFileMetadata(key: string): Promise<string> {
        const response = await request('http://api.weixin.qq.com/_/cos/metaid/encode', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({openid: '', bucket, paths: [key]}),
        });
        if (!response.ok) {
            throw new Error(`获取云托管对象元数据失败（HTTP ${response.status}）`);
        }
        const result = await response.json() as {
            errcode?: number;
            errmsg?: string;
            respdata?: {x_cos_meta_field_strs?: string[]};
        };
        const fileMetadata = result.respdata?.x_cos_meta_field_strs?.[0];
        if (result.errcode !== 0 || !fileMetadata) {
            throw new Error(`获取云托管对象元数据失败：${result.errmsg || result.errcode || '响应无效'}`);
        }
        return fileMetadata;
    }

    return {
        /** 根据数据库登记的云托管 cloudID 从 COS 读取题库 JSON。 */
        async download(fileID: string): Promise<Buffer> {
            const key = keyFromFileID(fileID);
            const cos = await createClient();
            const result = await cos.getObject({Bucket: bucket, Region: region, Key: key});
            if (result.statusCode !== 200 || !Buffer.isBuffer(result.Body)) {
                throw new Error('云托管对象存储文件内容无效');
            }
            return result.Body;
        },
        /** 上传文件并返回 cloudID；默认保持题库 JSON 类型，图片由路由传入校验后的类型。 */
        async upload(
            cloudPath: string,
            fileContent: Buffer,
            contentType = 'application/json; charset=utf-8',
        ): Promise<string> {
            const fileMetadata = await getFileMetadata(cloudPath);
            const cos = await createClient();
            const result = await cos.putObject({
                Bucket: bucket,
                Region: region,
                Key: cloudPath,
                StorageClass: 'STANDARD',
                Body: fileContent,
                ContentLength: fileContent.length,
                ContentType: contentType,
                Headers: {'x-cos-meta-fileid': fileMetadata},
            });
            if (result.statusCode !== 200) {
                throw new Error(`上传云托管对象存储文件失败（HTTP ${result.statusCode || '未知'}）`);
            }
            return `cloud://${environmentId}.${bucket}/${cloudPath}`;
        },
    };
}
