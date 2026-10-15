import { notFound, redirect } from 'next/navigation';
import App from '@/App';
import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import { PhrasePracticeLoader } from '@/components/PhrasePracticeLoader';

interface PageProps {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ category?: string }>;
}

export default async function PracticePage({ params, searchParams }: PageProps) {
  const { listId } = await params;
  const phraseList = phrasePracticeLists.find((item) => item.id === listId);
  if (phraseList) {
    const { category } = await searchParams;
    if (!category) redirect(`/settings?listId=${encodeURIComponent(listId)}`);
    if (!phraseList.categories.some((item) => item.name === category)) notFound();
    return <PhrasePracticeLoader key={`${listId}:${category}`} list={phraseList} category={category} />;
  }

  const list = vocabularyLists.find((item) => item.id === listId);
  if (!list) notFound();

  return <App listId={list.id} />;
}
