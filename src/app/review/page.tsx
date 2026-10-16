import { NotebookReviewApp } from '@/components/NotebookReviewApp';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams;
  return <NotebookReviewApp key={session ?? 'missing'} sessionId={typeof session === 'string' ? session : ''} />;
}
