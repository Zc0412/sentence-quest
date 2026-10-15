import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import SettingsPanel from './settings-panel';

interface PageProps {
  searchParams: Promise<{ listId?: string; category?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { listId, category } = await searchParams;
  const currentList = (listId === 'home-phrases' ? listId : undefined)
    ?? vocabularyLists.find((list) => list.id === listId)?.id
    ?? phrasePracticeLists.find((list) => list.id === listId)?.id
    ?? 'CET4_T';
  const phraseList = phrasePracticeLists.find((list) => list.id === currentList);
  const currentCategory = phraseList?.categories.find((item) => item.name === category)?.name
    ?? phraseList?.categories[0]?.name;
  return <SettingsPanel currentListId={currentList} currentCategory={currentCategory} />;
}
