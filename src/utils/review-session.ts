export interface ReviewSession { ids: string[]; returnHref: string }

export function normalizeReviewSession(value: unknown): ReviewSession | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<ReviewSession>;
  if (!Array.isArray(data.ids) || !data.ids.length || data.ids.length > 50 || !data.ids.every((id) => typeof id === 'string' && id.length > 0)
    || typeof data.returnHref !== 'string' || !data.returnHref.startsWith('/settings?')) return null;
  return { ids: [...new Set(data.ids)], returnHref: data.returnHref };
}
