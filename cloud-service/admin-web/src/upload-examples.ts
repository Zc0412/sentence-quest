/** 上传页格式示例，包含词汇双音标和短语逐词注释。 */
export const uploadExamples = {
  word: [
    {
      name: "apple",
      trans: ["n. 苹果"],
      ukphone: "ˈæpəl",
      usphone: "ˈæpəl",
    },
  ],
  phrase: [
    {
      id: "example-phrase-001",
      zh: "早上好",
      english: "good morning",
      words: ["good", "morning"],
      annotations: [
        {
          phonetic: "/ɡʊd/",
          meaning: "好的",
          pos: "adj.",
          color: "#3b82f6",
        },
        {
          phonetic: "/ˈmɔːnɪŋ/",
          meaning: "早晨",
          pos: "n.",
          color: "#3b82f6",
        },
      ],
    },
  ],
};
