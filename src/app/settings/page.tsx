import { vocabularyLists } from '@/data/vocabulary';
import SettingsPanel from './settings-panel';

interface PageProps {
  searchParams: Promise<{ listId?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { listId } = await searchParams;
  const currentList = vocabularyLists.find((list) => list.id === listId)?.id ?? 'CET4_T';
  return <SettingsPanel currentListId={currentList} />;
}
