import { SentencePracticeApp } from '@/components/SentencePracticeApp';
import homePhrases from '@/data/home-phrases.json';

export default function HomePage() {
  return <SentencePracticeApp sentenceList={homePhrases} title="精选短语 · 20 句" listId="home-phrases" isPhrasePractice />;
}
