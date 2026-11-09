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
}

export interface Services {
    list(): Promise<Dictionary[]>;
    get(id: string): Promise<Dictionary | undefined>;
    download(fileID: string): Promise<Buffer>;
    upload?(cloudPath: string, fileContent: Buffer, contentType?: string): Promise<string>;
    auth?: AuthRepository;
    authConfig?: AuthConfig;
    create?(record: DictionaryWrite): Promise<void>;
    update?(id: string, fields: Partial<DictionaryWrite>): Promise<boolean>;
    pronounce(event: {
        word?: unknown;
        type?: string;
    }): Promise<{
        ok: boolean;
        audio?: string;
        error?: string;
    }>;
}
