import { createHash } from 'node:crypto';

/**
 * GET /api/pronunciation?word=coffee&type=2
 *
 * 默认：代理有道 /pronounce/base 音频，word 支持单词或英文短句。
 * 如果配置了服务端 PRONUNCIATION_UPSTREAM_URL，则代理你自己的签名发音服务。
 * 注意：若使用不受控的第三方音频服务，上线前应确认授权与限流策略。
 */
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word')?.trim() ?? '';
  const requestedType = searchParams.get('type') ?? '';
  const type = /^[12]$/.test(requestedType)
    ? requestedType
    : String(Math.floor(Math.random() * 2) + 1);

  if (!word || word.length > 500 || !/^[a-zA-Z][a-zA-Z\s'’\-.,!?;:()"]*$/.test(word)) {
    return Response.json({ error: '请输入合法的英文单词或短句（最多 500 个字符）' }, { status: 400 });
  }

  const configuredEndpoint = process.env.PRONUNCIATION_UPSTREAM_URL?.trim();
  if (configuredEndpoint) {
    let endpoint: URL;
    try {
      endpoint = new URL(configuredEndpoint);
      if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && endpoint.hostname === 'localhost')) {
        throw new Error('仅允许 HTTPS，或本机 HTTP');
      }
    } catch {
      return Response.json({ error: '服务端发音接口地址配置无效' }, { status: 500 });
    }

    endpoint.searchParams.set('word', word);
    endpoint.searchParams.set('type', type);
    try {
      const upstream = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok || !upstream.body) {
        return Response.json({ error: '发音服务暂不可用' }, { status: 502 });
      }
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      // 保护代理：不要把上游的 HTML 错误页面伪装成音频。
      if (!contentType.toLowerCase().startsWith('audio/') && contentType !== 'application/octet-stream') {
        return Response.json({ error: '上游未返回音频数据' }, { status: 502 });
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=7200',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch {
      return Response.json({ error: '请求发音服务超时或失败' }, { status: 502 });
    }
  }

  const signedParams = {
    product: 'webdict',
    appVersion: '1',
    client: 'web',
    mid: '1',
    vendor: 'web',
    screen: '1',
    model: '1',
    imei: '1',
    network: 'wifi',
    keyfrom: 'dick',
    keyid: 'voiceDictWeb',
    mysticTime: String(Date.now()),
    yduuid: 'abcdefg',
    le: 'eng',
    rate: '4',
    word,
    type,
  };
  const signedKeys = Object.keys(signedParams).sort();
  const pointParam = [...signedKeys, 'key'].join(',');
  const signSource = [
    ...signedKeys.map((key) => `${key}=${signedParams[key as keyof typeof signedParams]}`),
    'key=U3uACNRWSDWdcsKm',
  ].join('&');
  const sign = createHash('md5').update(signSource, 'utf8').digest('hex');
  const params = new URLSearchParams({
    ...signedParams,
    phonetic: '',
    id: '',
    sign,
    pointParam,
  });
  const fallback = new URL('https://dict.youdao.com/pronounce/base');
  fallback.search = params.toString();

  try {
    const upstream = await fetch(fallback, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: '有道发音服务暂不可用' }, { status: 502 });
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.toLowerCase().startsWith('audio/') && contentType !== 'application/octet-stream') {
      return Response.json({ error: '有道未返回音频数据' }, { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=7200',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json({ error: '请求有道发音服务超时或失败' }, { status: 502 });
  }
}
