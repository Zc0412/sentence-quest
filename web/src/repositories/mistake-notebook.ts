import { normalizeNotebook } from '../utils/mistake-notebook';
import type { MistakeNotebook } from '../types/mistake-notebook';

export function transactNotebook(update?: (state: MistakeNotebook) => MistakeNotebook): Promise<MistakeNotebook> {
  return new Promise((resolve, reject) => {
    let database: IDBDatabase | undefined;
    let transaction: IDBTransaction | undefined;
    let settled = false;
    const finish = (error?: Error, state?: MistakeNotebook) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { try { transaction?.abort(); } catch { /* Already finished. */ } }
      database?.close();
      if (error) reject(error); else resolve(state!);
    };
    const timer = setTimeout(() => finish(new Error('错题本存档读取或保存超时')), 4000);
    try {
      const request = indexedDB.open('sentleap-mistakes', 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('state'); };
      request.onerror = () => finish(new Error('无法打开错题本存档'));
      request.onblocked = () => finish(new Error('错题本存档被其他标签页阻塞'));
      request.onsuccess = () => {
        database = request.result;
        if (settled) { database.close(); return; }
        database.onversionchange = () => database?.close();
        try {
          transaction = database.transaction('state', update ? 'readwrite' : 'readonly');
          const store = transaction.objectStore('state');
          const read = store.get('guest');
          let next: MistakeNotebook;
          read.onsuccess = () => {
            try {
              next = normalizeNotebook(read.result);
              if (update) { next = normalizeNotebook(update(next)); store.put(next, 'guest'); }
            } catch { finish(new Error('错题本存档格式异常')); }
          };
          transaction.oncomplete = () => finish(undefined, next);
          transaction.onerror = () => finish(new Error('错题本保存失败'));
          transaction.onabort = () => finish(new Error('错题本存档事务中断'));
        } catch { finish(new Error('无法访问错题本存档')); }
      };
    } catch { finish(new Error('浏览器不支持错题本存档')); }
  });
}
