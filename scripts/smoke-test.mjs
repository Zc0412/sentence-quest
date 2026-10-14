import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = new URL('..', import.meta.url).pathname;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(name) : ['.tsx', '.ts'].includes(extname(name)) ? [name] : [];
  });
}

const files = sourceFiles(join(root, 'src'));
for (const filename of files) {
  const source = readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(errors.length, 0, `${filename}: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n')}`);
}

async function loadTS(relativePath) {
  const file = join(root, relativePath);
  const result = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`);
}

const { isCorrectWord, isCorrectPrefix, normalizeWord } = await loadTS('src/utils/validator.ts');
assert.ok(isCorrectWord('COFFEE', 'coffee'));
assert.ok(isCorrectWord("don't", 'don’t'));
assert.ok(isCorrectPrefix('mor', 'morning'));
assert.ok(!isCorrectPrefix('mux', 'music'));
assert.equal(normalizeWord('Apple.'), 'apple');

const route = await loadTS('src/app/api/pronunciation/route.ts');
let response = await route.GET(new Request('http://localhost:3000/api/pronunciation?word=%3Cscript%3E'));
assert.equal(response.status, 400);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (requestUrl) => {
    const url = new URL(requestUrl);
    assert.equal(url.origin, 'https://dict.youdao.com');
    assert.equal(url.pathname, '/pronounce/base');
    assert.equal(url.searchParams.get('word'), 'coffee');
    assert.equal(url.searchParams.get('type'), '2');
    const pointParamKeys = url.searchParams.get('pointParam').split(',');
    const signSource = [
      ...pointParamKeys.filter((key) => key !== 'key').map((key) => `${key}=${url.searchParams.get(key)}`),
      'key=U3uACNRWSDWdcsKm',
    ].join('&');
    assert.equal(url.searchParams.get('sign'), createHash('md5').update(signSource, 'utf8').digest('hex'));
    return new Response(new Uint8Array([0x49, 0x44, 0x33]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  response = await route.GET(new Request('http://localhost:3000/api/pronunciation?word=coffee&type=2'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.equal((await response.arrayBuffer()).byteLength, 3);

  globalThis.fetch = async (requestUrl) => {
    const url = new URL(requestUrl);
    assert.equal(url.searchParams.get('word'), 'Some coordinate the time axis to ensure Chinese subtitles synchronize with the soundtracks.');
    assert.match(url.searchParams.get('type'), /^[12]$/);
    assert.equal(url.searchParams.get('product'), 'webdict');
    assert.match(url.searchParams.get('sign'), /^[a-f0-9]{32}$/);
    return new Response(new Uint8Array([0x49, 0x44, 0x33]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  response = await route.GET(new Request('http://localhost:3000/api/pronunciation?word=Some%20coordinate%20the%20time%20axis%20to%20ensure%20Chinese%20subtitles%20synchronize%20with%20the%20soundtracks.&type=2'));
  assert.equal(response.status, 200);

  globalThis.fetch = async (requestUrl) => {
    assert.match(new URL(requestUrl).searchParams.get('type'), /^[12]$/);
    return new Response(new Uint8Array([0x49]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  response = await route.GET(new Request('http://localhost:3000/api/pronunciation?word=coffee&type=99'));
  assert.equal(response.status, 200);

  process.env.PRONUNCIATION_UPSTREAM_URL = 'https://private.example.test/pronounce';
  globalThis.fetch = async (requestUrl) => {
    const url = new URL(requestUrl);
    assert.equal(url.searchParams.get('word'), 'morning');
    assert.match(url.searchParams.get('type'), /^[12]$/);
    return new Response(new Uint8Array([0x49, 0x44, 0x33]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  response = await route.GET(new Request('http://localhost:3000/api/pronunciation?word=morning'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.equal((await response.arrayBuffer()).byteLength, 3);
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.PRONUNCIATION_UPSTREAM_URL;
}

console.log(`✅ ${files.length} 个 TS/TSX 文件语法转译通过；逐词校验、发音路由校验及代理功能测试通过。`);
