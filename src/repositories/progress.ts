import type { Progress } from '../types/game';

/**
 * 游戏只通过此接口读写进度，不关心数据位于 IndexedDB 还是云端。
 * 将来可实现 RemoteProgressRepository，并在服务端登录后执行同步。
 */
export interface ProgressRepository {
  load(profileId: string): Promise<Progress | null>;
  save(profileId: string, progress: Progress): Promise<void>;
}

/** 将匿名存档与将来登录用户的存档区分开，避免意外覆盖云端记录。 */
export const GUEST_PROFILE_ID = 'guest';
