import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = fileURLToPath(new URL('..', import.meta.url));

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

const { isCorrectWord, isCorrectPrefix, normalizeWord, fillWordSpaces, nextHintLength } = await loadTS('src/utils/validator.ts');
assert.ok(isCorrectWord('COFFEE', 'coffee'));
assert.ok(isCorrectWord("don't", 'don’t'));
assert.ok(isCorrectPrefix('mor', 'morning'));
assert.ok(!isCorrectPrefix('mux', 'music'));
assert.equal(normalizeWord('Apple.'), 'apple');
assert.ok(isCorrectWord('cafe', 'café'), '重音字母支持普通字母输入');
assert.ok(isCorrectWord('office', 'oﬃce'), '兼容连字词条');
assert.ok(isCorrectWord('in addition to', 'in addition to'));
assert.equal(fillWordSpaces('pencilb', 'pencil box'), 'pencil b');
assert.equal(fillWordSpaces('pencilbox', 'pencil box'), 'pencil box');
assert.equal(fillWordSpaces('pencil box', 'pencil box'), 'pencil box');
assert.equal(fillWordSpaces('pencil', 'pencil box'), 'pencil');
assert.equal(fillWordSpaces('inadditionto', 'in addition to'), 'in addition to');
assert.equal(fillWordSpaces('pencil ', 'pencil box').trimEnd(), 'pencil', 'backspace can cross automatically inserted spaces');
assert.ok(!isCorrectPrefix(fillWordSpaces('pencilv', 'pencil box'), 'pencil box'), 'wrong letters are still errors');
assert.ok(!isCorrectPrefix(fillWordSpaces('pen cil', 'pencil box'), 'pencil box'), 'spaces in incorrect positions remain errors');
assert.equal(nextHintLength('pencil', 'pencil box', 0), 8, 'hint reveals the next letter, skipping the separator');
assert.equal(fillWordSpaces('', 'pencil box'), '');
assert.equal(fillWordSpaces('apple', 'apple'), 'apple');

const { getTypingKey } = await loadTS('src/utils/typingKey.ts');
const key = (code, keyValue = 'Process', shiftKey = false, characters = '') => getTypingKey({ code, key: keyValue, shiftKey }, characters);
assert.equal(key('KeyA'), 'a', '中文输入法仍按实体键输入');
assert.equal(key('Space', ' ', false, 'in addition'), ' ');
assert.equal(key('Space', ' '), null, '普通单词不接收多余空格');
assert.equal(key('Digit3', 'Process', false, 'MP3'), '3');
assert.equal(key('Slash', 'Process', false, 'and/or'), '/');
assert.equal(key('Period', 'Process', false, 'U.S.'), '.');
assert.equal(key('Digit2', 'Process', true, 'at/@'), '@');
assert.equal(key('Backspace'), 'Backspace');
assert.equal(key('Escape'), 'Escape');


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
  assert.equal(response.headers.get('cache-control'), 'private, max-age=7200');
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

const { loadPronunciationAudio } = await loadTS('src/utils/speech.ts');
let audioRequests = 0;
globalThis.fetch = async (requestUrl) => {
  audioRequests += 1;
  const url = new URL(requestUrl, 'http://localhost');
  return new Response(new Uint8Array([0x49, 0x44, 0x33]), {
    headers: { 'Content-Type': 'audio/mpeg', 'X-Test-Type': url.searchParams.get('type') },
  });
};
try {
  const britishAudio = await loadPronunciationAudio('hello', '1');
  assert.equal((await loadPronunciationAudio('hello', '1')), britishAudio, '重复播放应复用缓存的音频');
  const americanAudio = await loadPronunciationAudio('hello', '2');
  assert.notEqual(americanAudio, britishAudio, '不同口音应使用不同音频缓存');
  assert.equal(audioRequests, 2, '同一单词与口音只应请求一次音频接口');
} finally {
  globalThis.fetch = originalFetch;
}

console.log(`✅ ${files.length} 个 TS/TSX 文件语法转译通过；逐词校验、发音路由校验及代理功能测试通过。`);
