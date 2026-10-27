import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
async function loadTS(path) {
  const { outputText } = ts.transpileModule(read(path).toString(), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const source = `const __dirname = ${JSON.stringify(fileURLToPath(new URL('..', import.meta.url)))};\n${outputText}`;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { default: manifest } = await loadTS('src/app/manifest.ts');
const app = manifest();
assert.equal(app.start_url, '/'); assert.equal(app.scope, '/'); assert.equal(app.id, '/'); assert.equal(app.display, 'standalone');
for (const icon of [...app.icons, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }]) {
  const png = read(`public${icon.src}`);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
const { getInstallPlatform } = await loadTS('src/utils/pwa.ts');
assert.equal(getInstallPlatform('Mozilla iPhone Safari', 1), 'ios');
assert.equal(getInstallPlatform('Mozilla Macintosh Safari', 5), 'ios');
assert.equal(getInstallPlatform('Mozilla Macintosh Safari', 0), 'mac');
assert.equal(getInstallPlatform('Mozilla Macintosh Chrome Safari', 0), 'browser');
assert.equal(getInstallPlatform('Mozilla Android MicroMessenger', 1), 'embedded');
assert.equal(getInstallPlatform('Mozilla Windows Firefox', 0), 'browser');

const handlers = {};
const stores = new Map();
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return { put: async (url, response) => stores.get(name).set(url, response), match: async (url) => stores.get(name).get(url)?.clone() };
  },
  keys: async () => [...stores.keys()],
  delete: async (name) => stores.delete(name),
};
let network = async () => new Response(read('public/offline.html'), { headers: { 'Content-Type': 'text/html' } });
let claimed = false;
vm.runInNewContext(read('public/sw.js').toString(), {
  URL, Response, caches, fetch: (...args) => network(...args),
  self: { addEventListener: (type, fn) => { handlers[type] = fn; }, location: { origin: 'https://sentleap.test' }, clients: { claim: async () => { claimed = true; } } },
});
async function lifecycle(type) {
  let task;
  handlers[type]({ waitUntil(promise) { task = promise; } });
  await task;
}
await lifecycle('install');
stores.set('sentleap-offline-old', new Map()); stores.set('unrelated-app-cache', new Map());
await lifecycle('activate');
assert.ok(claimed); assert.ok(!stores.has('sentleap-offline-old')); assert.ok(stores.has('unrelated-app-cache'));
function request(url, mode = 'navigate', method = 'GET') {
  let response;
  handlers.fetch({ request: { url, mode, method }, respondWith(value) { response = value; } });
  return response;
}
network = async () => new Response('latest HTML');
assert.equal(await (await request('https://sentleap.test/settings?tab=install')).text(), 'latest HTML');
network = async () => new Response('server error', { status: 500 });
assert.equal((await request('https://sentleap.test/')).status, 500, '服务错误不能被旧页面掩盖');
network = async () => { throw new Error('offline'); };
assert.match(await (await request('https://sentleap.test/practice/CET4_T')).text(), /连上网络/);
assert.equal(request('https://sentleap.test/api/feedback', 'navigate', 'POST'), undefined);
assert.equal(request('https://sentleap.test/api/pronunciation?word=hello'), undefined);
assert.equal(request('https://sentleap.test/_next/static/test.js'), undefined);
assert.equal(request('https://sentleap.test/settings?_rsc=test', 'cors'), undefined);
assert.equal(request('https://sentleap.test/dictionaries/words/CET4_T.json', 'cors'), undefined);
assert.equal(request('https://other.test/'), undefined);
stores.clear();
assert.equal((await request('https://sentleap.test/')).status, 503, '缓存被清理后仍提供可读错误');
network = async () => new Response('Not found', { status: 404 });
await assert.rejects(lifecycle('install'), /unavailable/);
const { default: nextConfig } = await loadTS('next.config.ts');
assert.ok((await nextConfig.headers()).find((rule) => rule.source === '/sw.js').headers.some((header) => header.key === 'Cache-Control' && header.value.includes('no-store')));
console.log('✅ PWA：Manifest / 图标尺寸 / 平台识别 / 离线回退 / 缓存升级隔离 / API 与 RSC 绕过检查通过。');
