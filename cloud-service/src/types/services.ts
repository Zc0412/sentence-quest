/** 题库数据与路由依赖契约。 */
import type { DictionaryWrite } from '../schemas/dictionary';
export interface Dictionary {
    id: string;
    label: string;
    kind: string;
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
    adminToken?: string;
    upload?(cloudPath: string, bytes: Buffer): Promise<string>;
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
