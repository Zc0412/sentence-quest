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
    createCos?: (
        options: COS.COSOptions,
    ) => Pick<COS, 'getObject' | 'putObject' | 'deleteObject' | 'listObjectVersions'>;
}

/** 创建微信云托管对象存储服务；对象存储桶与地域需从云托管控制台配置。 */
export function createCloudStorage(env: StorageEnvironment = process.env, dependencies: StorageDependencies = {}) {
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
                const result = (await response.json()) as Partial<CloudRunCredentials>;
                const expiredTime = Number(result.ExpiredTime);
                if (
                    typeof result.TmpSecretId !== 'string' ||
                    typeof result.TmpSecretKey !== 'string' ||
                    typeof result.Token !== 'string' ||
                    !Number.isInteger(expiredTime) ||
                    expiredTime <= Math.floor(Date.now() / 1000)
                ) {
                    throw new Error('云托管 COS 临时密钥响应无效');
                }
                cachedCredentials = { ...result, ExpiredTime: expiredTime } as CloudRunCredentials;
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
            getAuthorization: (_options, callback) =>
                callback({
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
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ openid: '', bucket, paths: [key] }),
        });
        if (!response.ok) {
            throw new Error(`获取云托管对象元数据失败（HTTP ${response.status}）`);
        }
        const result = (await response.json()) as {
            errcode?: number;
            errmsg?: string;
            respdata?: { x_cos_meta_field_strs?: string[] };
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
            const result = await cos.getObject({ Bucket: bucket, Region: region, Key: key });
            if (result.statusCode !== 200 || !Buffer.isBuffer(result.Body)) {
                throw new Error('云托管对象存储文件内容无效');
            }
            return result.Body;
        },
        /** 精确删除数据库登记的对象及其历史版本；不按前缀批量删除，缺失文件可安全重试。 */
        async deleteFile(fileID: string): Promise<void> {
            const key = keyFromFileID(fileID);
            if (!key.startsWith('dictionaries/') || !key.endsWith('.json')) {
                throw new Error('仅允许删除题库 JSON 文件');
            }
            const cos = await createClient();
            const versions: { Key: string; VersionId: string }[] = [];
            let marker: string | undefined;
            let versionMarker: string | undefined;
            const seen = new Set<string>();
            // 先完整枚举再删除，避免删除过程中分页标记变化导致跳过版本。
            for (;;) {
                // 当前 SDK 的类型声明使用旧 Marker 名称；实际请求与响应为 KeyMarker。
                const params: COS.ListObjectVersionsParams & { KeyMarker?: string } = {
                    Bucket: bucket,
                    Region: region,
                    Prefix: key,
                    KeyMarker: marker,
                    VersionIdMarker: versionMarker,
                    MaxKeys: '1000',
                };
                const page = (await cos.listObjectVersions(params)) as COS.ListObjectVersionsResult & {
                    NextKeyMarker?: string;
                };
                if (page.statusCode !== 200) throw new Error('读取题库文件版本失败');
                versions.push(
                    ...[...(page.Versions || []), ...(page.DeleteMarkers || [])]
                        .filter((entry) => entry.Key === key)
                        .map((entry) => ({ Key: entry.Key, VersionId: entry.VersionId })),
                );
                if (versions.length > 10000) throw new Error('文件版本过多，请通过受控存储管理工具清理');
                if (String(page.IsTruncated) !== 'true') break;
                const cursor = JSON.stringify([page.NextKeyMarker, page.NextVersionIdMarker]);
                if (!page.NextKeyMarker || seen.has(cursor)) throw new Error('题库文件版本分页无效');
                seen.add(cursor);
                marker = page.NextKeyMarker;
                versionMarker = page.NextVersionIdMarker;
            }
            for (const version of versions) {
                const result = await cos.deleteObject({
                    Bucket: bucket,
                    Region: region,
                    Key: key,
                    ...(version.VersionId ? { VersionId: version.VersionId } : {}),
                });
                if (![200, 204].includes(result.statusCode || 0)) throw new Error('删除题库文件版本失败');
            }
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
                Headers: { 'x-cos-meta-fileid': fileMetadata },
            });
            if (result.statusCode !== 200) {
                throw new Error(`上传云托管对象存储文件失败（HTTP ${result.statusCode || '未知'}）`);
            }
            return `cloud://${environmentId}.${bucket}/${cloudPath}`;
        },
    };
}
