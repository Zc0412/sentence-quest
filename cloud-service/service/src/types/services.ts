/** 题库数据与路由依赖契约。 */
import type { AuthConfig, AuthRepository } from '../auth/types';
import type { DictionaryWrite } from '../schemas/dictionary';

export interface Dictionary {
    id: string;
    label: string;
    kind: 'word' | 'phrase';
    category: string;
    wordCount: number;
    sha256: string;
    fileID: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminDictionaryQuery {
    page: number;
    pageSize: number;
    q?: string;
    category?: string;
    kind?: 'word' | 'phrase';
    status?: 'published' | 'draft' | 'archived';
}

export interface Services {
    listAdmin?(query: AdminDictionaryQuery): Promise<{ dictionaries: Dictionary[]; total: number }>;
    list(): Promise<Dictionary[]>;
    get(id: string): Promise<Dictionary | undefined>;
    download(fileID: string): Promise<Buffer>;
    deleteFile?(fileID: string): Promise<void>;
    remove?(id: string, deleteFile: (fileID: string) => Promise<void>): Promise<boolean>;
    upload?(cloudPath: string, fileContent: Buffer, contentType?: string): Promise<string>;
    auth?: AuthRepository;
    authConfig?: AuthConfig;
    create?(record: DictionaryWrite): Promise<void>;
    update?(id: string, fields: Partial<DictionaryWrite>): Promise<boolean>;
    pronounce(event: { word?: unknown; type?: string }): Promise<{
        ok: boolean;
        audio?: string;
        error?: string;
    }>;
}

/** 删除冲突单独返回 409，不向客户端暴露数据库或存储细节。 */
export class DictionaryDeleteConflict extends Error {}
