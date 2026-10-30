const https = require('https');
const { createHash } = require('crypto');

const MAX_AUDIO_BYTES = 1024 * 1024;
const UPSTREAM = 'https://dict.youdao.com/pronounce/base';

exports.main = async (event = {}) => {
  const word = typeof event.word === 'string' ? event.word.trim() : '';
  const type = event.type;
  if (!word || word.length > 500 || !/^[a-zA-Z][a-zA-Z\s'’\-.,!?;:()"]*$/.test(word) || !['1', '2'].includes(type)) {
    return { ok: false, error: '发音内容或口音无效' };
  }
  const url = new URL(UPSTREAM);
  const signedParams = { product: 'webdict', appVersion: '1', client: 'web', mid: '1', vendor: 'web', screen: '1', model: '1', imei: '1', network: 'wifi', keyfrom: 'dick', keyid: 'voiceDictWeb', mysticTime: String(Date.now()), yduuid: 'abcdefg', le: 'eng', rate: '4', word, type };
  const keys = Object.keys(signedParams).sort();
  const signSource = [...keys.map((key) => `${key}=${signedParams[key]}`), 'key=U3uACNRWSDWdcsKm'].join('&');
  url.search = new URLSearchParams({ ...signedParams, phonetic: '', id: '', sign: createHash('md5').update(signSource, 'utf8').digest('hex'), pointParam: [...keys, 'key'].join(',') }).toString();
  try {
    const audio = await new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        const contentType = String(response.headers['content-type'] || '').toLowerCase();
        if (response.statusCode !== 200 || (!contentType.startsWith('audio/') && contentType !== 'application/octet-stream')) {
          response.resume(); reject(new Error('invalid audio response')); return;
        }
        const chunks = []; let size = 0;
        response.on('data', (chunk) => { size += chunk.length; if (size > MAX_AUDIO_BYTES) response.destroy(new Error('audio too large')); else chunks.push(chunk); });
        response.on('end', () => { if (!size) reject(new Error('empty audio')); else resolve(Buffer.concat(chunks)); });
        response.on('error', reject);
      });
      request.setTimeout(8000, () => request.destroy(new Error('timeout')));
      request.on('error', reject);
    });
    return { ok: true, audio: audio.toString('base64') };
  } catch (error) {
    console.warn('pronunciation upstream failed:', error.code || error.message || 'unknown error');
    return { ok: false, error: '发音服务暂不可用' };
  }
};
