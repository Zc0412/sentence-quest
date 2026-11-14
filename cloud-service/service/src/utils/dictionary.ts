/** 公开题库的可见性与字段筛选。 */
import type { Dictionary } from '../types/services';
/** 未设置状态的历史题库按已发布处理；显式下架的题库不对外展示。 */
export function visible(row: Dictionary) { return (!row.status || row.status === 'published') && ['word', 'phrase'].includes(row.kind); }
/** 只返回小程序需要的目录字段。 */
export function publicMetadata(row: Dictionary) { return { id: row.id, label: row.label, kind: row.kind, category: row.category, wordCount: row.wordCount, sha256: row.sha256 }; }
