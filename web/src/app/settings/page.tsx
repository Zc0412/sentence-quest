import { vocabularyLists } from '@/data/vocabulary';
import { phrasePracticeLists } from '@/data/phrase-practice';
import SettingsPanel from './settings-panel';
import { vocabularyGroups } from '@/utils/vocabulary-groups';

interface PageProps {
  searchParams: Promise<{ listId?: string; category?: string; group?: string; tab?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { listId, category, group, tab } = await searchParams;
  const currentList = (listId === 'home-phrases' ? listId : undefined)
    ?? vocabularyLists.find((list) => list.id === listId)?.id
    ?? phrasePracticeLists.find((list) => list.id === listId)?.id
    ?? 'CET4_T';
  const phraseList = phrasePracticeLists.find((list) => list.id === currentList);
  const currentCategory = phraseList?.categories.find((item) => item.name === category)?.name
    ?? phraseList?.categories[0]?.name;
  const vocabularyList = vocabularyLists.find((list) => list.id === currentList);
  const currentGroup = vocabularyList ? vocabularyGroups(vocabularyList.wordCount).find((item) => String(item.id) === group)?.id ?? 1 : undefined;
  const initialTab = tab && ['dictionary', 'mistakes', 'practice', 'shortcuts', 'install'].includes(tab) ? tab : 'dictionary';
  return <SettingsPanel currentListId={currentList} currentCategory={currentCategory} currentGroup={currentGroup} initialTab={initialTab} />;
}
