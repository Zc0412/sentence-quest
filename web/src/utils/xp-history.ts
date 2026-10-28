import type { XpEntry } from '../types/xp-history';

export const XP_HISTORY_LIMIT = 500;

/** Newest first. The progress reward gate determines whether an entry is added. */
export function appendXpEntry(entries: XpEntry[] | undefined, entry: XpEntry): XpEntry[] {
  if (entry.amount <= 0) return entries ?? [];
  return [entry, ...(entries ?? [])].slice(0, XP_HISTORY_LIMIT);
}

/** Older saves have only a total. Never infer dates or exercises from that total. */
export function normalizeXpHistory(value: unknown, total: number): XpEntry[] {
  if (!Array.isArray(value)) return [];
  let remaining = total;
  const result: XpEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object'
      || !['word', 'phrase', 'sentence'].includes(entry.kind)
      || typeof entry.at !== 'string' || !Number.isFinite(Date.parse(entry.at))
      || typeof entry.perfect !== 'boolean' || entry.amount !== (entry.perfect ? 15 : 10)
      || !['listId', 'sourceLabel', 'text', 'meaning'].every((key) => typeof entry[key] === 'string')
      || !entry.text.trim() || entry.amount > remaining) continue;
    result.push({ at: new Date(entry.at).toISOString(), kind: entry.kind, listId: entry.listId.slice(0, 200),
      sourceLabel: entry.sourceLabel.slice(0, 200), text: entry.text.slice(0, 2000), meaning: entry.meaning.slice(0, 2000),
      amount: entry.amount, perfect: entry.perfect });
    remaining -= entry.amount;
    if (result.length === XP_HISTORY_LIMIT) break;
  }
  return result;
}
