import { notFound } from 'next/navigation';
import { PhrasePracticeLoader } from '@/components/PhrasePracticeLoader';
import { phrasePracticeLists } from '@/data/phrase-practice';

interface PageProps {
  params: Promise<{ phraseListId: string }>;
}

export default async function PhrasePracticePage({ params }: PageProps) {
  const { phraseListId } = await params;
  const list = phrasePracticeLists.find((item) => item.id === phraseListId);
  if (!list) notFound();

  return <PhrasePracticeLoader list={list} />;
}
