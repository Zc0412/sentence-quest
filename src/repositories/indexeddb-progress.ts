import type { Progress } from '../types/game';
import type { ProgressRepository } from './progress';

export const DATABASE_NAME = 'sentleap';
const LEGACY_DATABASE_NAME = 'sentence-quest';
export const DATABASE_VERSION = 1;
export const PROGRESS_STORE = 'progress';

// 某些浏览器/扩展/隐私环境会让 IDBOpenDBRequest 或事务不触发结束事件。
// 无论何种情况，仓储都必须在有限时间内返回成功或失败，不能让游戏永远处于 loading。
export const IDB_OPERATION_TIMEOUT_MS = 4000;

interface ProgressRecord {
  profileId: string;
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  progress: Progress;
}

let opening: Promise<IDBDatabase> | null = null;

function openLegacyDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finishError = (reason: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(reason);
    };
    const timer = setTimeout(() => {
      finishError(new Error('旧版 IndexedDB 打开超时，原学习进度仍保留'));
    }, IDB_OPERATION_TIMEOUT_MS);

    try {
      const request = indexedDB.open(LEGACY_DATABASE_NAME);
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          db.close();
          resolve(null);
          return;
        }
        resolve(db);
      };
      request.onerror = () => finishError(request.error ?? new Error('旧版 IndexedDB 打开失败'));
      request.onblocked = () => finishError(new Error('其他标签页阻止读取旧版 IndexedDB，请关闭旧标签页后重试'));
    } catch (error) {
      finishError(error instanceof Error ? error : new Error('旧版 IndexedDB 初始化失败'));
    }
  });
}

async function migrateLegacyDatabase(db: IDBDatabase): Promise<void> {
  const legacyDb = await openLegacyDatabase();
  if (!legacyDb) return;

  try {
    const records = await withTransactionTimeout(
      legacyDb,
      'readonly',
      (tx) => {
        let savedRecords: ProgressRecord[] = [];
        const request = tx.objectStore(PROGRESS_STORE).getAll();
        request.onsuccess = () => { savedRecords = request.result as ProgressRecord[]; };
        return () => savedRecords;
      },
      '读取旧版学习进度',
    );
    if (records.length === 0) return;

    await withTransactionTimeout(
      db,
      'readwrite',
      (tx) => {
        const store = tx.objectStore(PROGRESS_STORE);
        for (const record of records) {
          const request = store.get(record.profileId);
          request.onsuccess = () => {
            if (request.result === undefined) store.put(record);
          };
        }
        return () => undefined;
      },
      '迁移旧版学习进度',
    );
  } finally {
    legacyDb.close();
  }
}

export function openGameDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('当前环境不支持 IndexedDB'));
  }
  if (opening) return opening;

  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const finishError = (reason: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(reason);
    };
    const timer = setTimeout(() => {
      finishError(new Error('IndexedDB 打开超时，请检查浏览器存储权限或其他标签页'));
    }, IDB_OPERATION_TIMEOUT_MS);

    try {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
            db.createObjectStore(PROGRESS_STORE, { keyPath: 'profileId' });
          }
        } catch (error) {
          finishError(error instanceof Error ? error : new Error('IndexedDB 结构升级失败'));
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // 超时后才成功的连接不能重新让已失败的请求变成成功；关闭它防止泄漏。
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        db.onclose = () => { opening = null; };
        void migrateLegacyDatabase(db).then(
          () => resolve(db),
          (error: unknown) => {
            db.close();
            reject(error instanceof Error ? error : new Error('旧版学习进度迁移失败'));
          },
        );
      };
      request.onerror = () => finishError(request.error ?? new Error('IndexedDB 打开失败'));
      request.onblocked = () => finishError(new Error('其他标签页阻止了数据库升级，请关闭旧标签页'));
    } catch (error) {
      finishError(error instanceof Error ? error : new Error('IndexedDB 初始化失败'));
    }
  });

  // 失败后不永久缓存 rejected promise；下次访问仍能尝试重新连接。
  opening = pending.catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

/** 事务结束事件不可用时主动 abort 并失败，防止读写 Promise 永久 pending。 */
function withTransactionTimeout<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => () => T,
  errorLabel: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(PROGRESS_STORE, mode);
    } catch (error) {
      reject(error);
      return;
    }
    let settled = false;
    let readValue: () => T = () => { throw new Error('事务没有返回结果'); };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else {
        try { resolve(readValue()); } catch (reason) { reject(reason); }
      }
    };
    const timer = setTimeout(() => {
      try { tx.abort(); } catch { /* 事务可能已经结束但事件未送达 */ }
      finish(new Error(`${errorLabel}超时`));
    }, IDB_OPERATION_TIMEOUT_MS);
    tx.oncomplete = () => finish();
    tx.onerror = () => finish(tx.error ?? new Error(`${errorLabel}失败`));
    tx.onabort = () => finish(tx.error ?? new Error(`${errorLabel}被取消`));
    try {
      const setValue = run(tx);
      readValue = setValue;
    } catch (error) {
      try { tx.abort(); } catch { /* 忽略 */ }
      finish(error instanceof Error ? error : new Error(errorLabel));
    }
  });
}

export class IndexedDbProgressRepository implements ProgressRepository {
  async load(profileId: string): Promise<Progress | null> {
    const db = await openGameDatabase();
    return withTransactionTimeout(db, 'readonly', (tx) => {
      let record: ProgressRecord | undefined;
      const request = tx.objectStore(PROGRESS_STORE).get(profileId);
      request.onsuccess = () => { record = request.result as ProgressRecord | undefined; };
      return () => record?.progress ?? null;
    }, '读取学习进度');
  }

  async save(profileId: string, progress: Progress): Promise<void> {
    const db = await openGameDatabase();
    return withTransactionTimeout(db, 'readwrite', (tx) => {
      const store = tx.objectStore(PROGRESS_STORE);
      const read = store.get(profileId);
      read.onsuccess = () => {
        const previous = read.result as ProgressRecord | undefined;
        const next: ProgressRecord = {
          profileId,
          schemaVersion: 1,
          revision: (previous?.revision ?? 0) + 1,
          updatedAt: new Date().toISOString(),
          progress,
        };
        store.put(next);
      };
      return () => undefined;
    }, '保存学习进度');
  }
}
