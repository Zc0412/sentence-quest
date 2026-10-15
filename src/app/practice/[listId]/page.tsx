import { notFound } from 'next/navigation';
import App from '@/App';
import { vocabularyLists } from '@/data/vocabulary';

interface PageProps {
  params: Promise<{ listId: string }>;
}

export default async function PracticePage({ params }: PageProps) {
  const { listId } = await params;
  const list = vocabularyLists.find((item) => item.id === listId);
  if (!list) notFound();

  return <App listId={list.id} />;
}
