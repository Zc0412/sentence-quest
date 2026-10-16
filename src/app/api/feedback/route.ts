import { createHmac } from 'node:crypto';

export const runtime = 'nodejs';

// Atomically deduplicate retries, enforce limits, and persist feedback without expiry.
const SAVE_FEEDBACK = `
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then return 1 end
if tonumber(redis.call('GET', KEYS[2]) or '0') >= 5 then return 0 end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= 100 then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], 600) end
if redis.call('INCR', KEYS[3]) == 1 then redis.call('EXPIRE', KEYS[3], 86400) end
return 1
`;

function reply(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply('不允许跨站提交。', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('请使用 JSON 提交。', 415);

  // Bound the actual request stream, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return reply('反馈内容不能为空。', 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  let body: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) {
        await reader.cancel();
        return reply('反馈内容过长。', 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return reply('反馈格式不正确。', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply('反馈格式不正确。', 400);
  const { id, type, content, contact, page } = body as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || typeof type !== 'string' || !['bug', 'suggestion', 'other'].includes(type)
    || typeof content !== 'string' || !content.trim() || content.length > 2000
    || typeof contact !== 'string' || contact.length > 200
    || typeof page !== 'string' || page.length > 500 || !page.startsWith('/') || page.startsWith('//')) {
    return reply('请检查反馈内容（最多 2000 字）和联系方式（最多 200 字）。', 400);
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return reply('反馈服务暂未配置，请稍后再试。', 503);

  // Only trust Vercel's platform-controlled IP header. Other deployments share a bucket.
  const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') ?? 'shared' : 'shared';
  const fingerprint = createHmac('sha256', token).update(ip).digest('hex');
  const record = { id, type, content: content.trim(), contact: contact.trim(), page: page.split(/[?#]/)[0], createdAt: new Date().toISOString(), status: 'new' };
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:') throw new Error('Invalid configuration');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', SAVE_FEEDBACK, 3, 'sentleap:feedback', `sentleap:feedback:rate:${fingerprint}`, 'sentleap:feedback:daily', id, JSON.stringify(record)]),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    if (!response.ok || result.error || (result.result !== 0 && result.result !== 1)) throw new Error('Storage unavailable');
    if (result.result === 0) return reply('提交较频繁，请稍后再试。', 429);
    return Response.json({ ok: true });
  } catch {
    return reply('暂时无法保存反馈，请稍后重试。', 503);
  }
}
