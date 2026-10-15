export interface PhrasePracticeList {
  id: string;
  label: string;
  description: string;
  file: string;
  category: '短语练习';
  tags: string[];
  wordCount: number;
}

export const phrasePracticeLists: PhrasePracticeList[] = [
  {
    id: 'phrase-sentences',
    label: '短语练习 · 中文题库',
    description: '根据中文提示逐词拼写英文，练习常用短语和表达。',
    file: '/dictionaries/words/phrase-sentences.json',
    category: '短语练习',
    tags: ['短语题库'],
    wordCount: 900,
  },
  {
    id: 'phrase-english-sentences',
    label: '短语练习 · 英文题库',
    description: '练习第二组短语与例句，学习进度独立保存。',
    file: '/dictionaries/words/phrase-english-sentences.json',
    category: '短语练习',
    tags: ['短语题库'],
    wordCount: 1000,
  },
];
