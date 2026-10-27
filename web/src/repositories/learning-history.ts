import { normalizeHistory } from '../utils/learning-history';
import type { LearningHistory } from '../types/learning-history';

// Retain the legacy database name to preserve existing learning traces.
// Older reward data stays untouched; this module reads and writes only history.
export function transactHistory(update?: (state: LearningHistory) => LearningHistory): Promise<LearningHistory> {
  return new Promise((resolve, reject) => {
    let database: IDBDatabase | undefined;
    let transaction: IDBTransaction | undefined;
    let settled = false;
    const finish = (error?: Error, state?: LearningHistory) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { try { transaction?.abort(); } catch { /* Already finished. */ } }
      database?.close();
      if (error) reject(error); else resolve(state!);
    };
    const timer = setTimeout(() => finish(new Error('学习轨迹存档读取或保存超时')), 4000);
    try {
      const request = indexedDB.open('sentleap-rewards', 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('state'); };
      request.onerror = () => finish(new Error('无法打开学习轨迹存档'));
      request.onblocked = () => finish(new Error('学习轨迹存档被旧标签页阻塞'));
      request.onsuccess = () => {
        database = request.result;
        if (settled) { database.close(); return; }
        database.onversionchange = () => database?.close();
        try {
          transaction = database.transaction('state', update ? 'readwrite' : 'readonly');
          const store = transaction.objectStore('state');
          const read = store.get('guest');
          let next: LearningHistory;
          read.onsuccess = () => {
            try {
              next = normalizeHistory(read.result);
              if (update) { next = update(next); store.put({ ...read.result, ...next }, 'guest'); }
            } catch { finish(new Error('学习轨迹存档格式异常')); }
          };
          transaction.oncomplete = () => finish(undefined, next);
          transaction.onerror = () => finish(new Error('学习轨迹存档保存失败'));
          transaction.onabort = () => finish(new Error('学习轨迹存档事务中断'));
        } catch { finish(new Error('无法访问学习轨迹存档')); }
      };
    } catch { finish(new Error('浏览器不支持学习轨迹存档')); }
  });
}
