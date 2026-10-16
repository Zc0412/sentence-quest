import { notFound, redirect } from 'next/navigation';
import App from '@/App';
import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import { PhrasePracticeLoader } from '@/components/PhrasePracticeLoader';
import { vocabularyGroups } from '@/utils/vocabulary-groups';

interface PageProps {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ category?: string; group?: string }>;
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

  const { group } = await searchParams;
  // Existing bookmarks continue with the first group.
  if (group === undefined) redirect(`/practice/${encodeURIComponent(list.id)}?group=1`);
  if (!/^[1-9]\d*$/.test(group) || !vocabularyGroups(list.wordCount).some((item) => item.id === Number(group))) notFound();
  return <App key={`${list.id}:${group}`} listId={list.id} group={Number(group)} />;
}
