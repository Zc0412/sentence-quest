export interface PhrasePracticeList {
  id: string;
  label: string;
  description: string;
  file: string;
  category: '短语练习';
  tags: string[];
  wordCount: number;
  categories: { name: string; count: number }[];
}

export const phrasePracticeLists: PhrasePracticeList[] = [
  {
    id: 'phrase-sentences',
    label: '常用表达 · 场景篇',
    description: '涵盖日常生活、饮食购物、职场办公、旅行交通等十类场景，看中文逐词拼写英文，完成后听完整表达。',
    file: '/dictionaries/words/everyday-expressions-900.json',
    category: '短语练习',
    tags: ['常用表达'],
    wordCount: 900,
    categories: ['日常生活', '饮食购物', '家庭朋友', '学校学习', '职场办公', '旅行交通', '健康运动', '时间天气', '社交沟通', '兴趣成长'].map((name) => ({ name, count: 90 })),
  },
  {
    id: 'phrase-english-sentences',
    label: '常用表达 · 句型篇',
    description: '从 be 动词、指示代词到常用动词、否定句与 can 句型，看中文逐词拼写英文，巩固基础句型。',
    file: '/dictionaries/words/basic-sentence-patterns-1000.json',
    category: '短语练习',
    tags: ['常用表达'],
    wordCount: 1000,
    categories: [
      { name: '日常生活', count: 158 },
      { name: '学校', count: 188 },
      { name: '饮食', count: 189 },
      { name: '购物', count: 69 },
      { name: '出行', count: 110 },
      { name: '家庭', count: 93 },
      { name: '工作', count: 94 },
      { name: '爱好', count: 99 },
    ],
  },
];

if (process.env.NODE_ENV === 'development') {
  phrasePracticeLists.push({
    id: 'phrase-dev-test',
    label: '开发测试 · 两条短语',
    description: '仅开发环境显示，用两条短语快速测试答题、完成页和全部完成流程。',
    file: '/dictionaries/words/phrase-dev-test.json',
    category: '短语练习',
    tags: ['开发测试'],
    wordCount: 2,
    categories: [{ name: '功能测试', count: 2 }],
  });
}
