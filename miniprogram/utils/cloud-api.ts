/** 小程序通过关联的云开发环境访问 Hono 云托管接口。 */
import config from '../config';

/** 请求 JSON 接口，并统一处理 HTTP 和网络错误。 */
export function cloudGet(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!config.cloudEnvId || !config.cloudServiceName || !wx.cloud?.callContainer) { reject(new Error('请先配置云托管服务')); return; }
    wx.cloud.callContainer({ config: { env: config.cloudEnvId }, path, method: 'GET', header: { 'X-WX-SERVICE': config.cloudServiceName },
      success(response) { if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data); else reject(new Error('云端题库暂不可用')); },
      fail() { reject(new Error('云端题库连接失败')); },
    });
  });
}
