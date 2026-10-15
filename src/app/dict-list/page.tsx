import DictionaryList from './dictionary-list';
import { vocabularyLists } from '@/data/vocabulary';

export default async function DictionaryListPage({ searchParams }: { searchParams: Promise<{ listId?: string }> }) {
  const { listId } = await searchParams;
  const currentListId = vocabularyLists.find((list) => list.id === listId)?.id ?? 'CET4_T';
  return <DictionaryList currentListId={currentListId} />;
}
