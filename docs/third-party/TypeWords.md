# TypeWords 词典来源

- 项目：https://github.com/zyronon/TypeWords
- 调研代码版本：`6da76413bee9df46b16a3da5c4acc7e1eda29a9a`
- 对应页面：https://typewords.cc/dict-list
- 页面实际使用的目录：https://files.typewords.cc/list/word.json
- 数据地址：`https://files.typewords.cc/dicts/en/word/{url}`
- 同步工具：`python3 scripts/sync-typewords.py`（Python 3，无额外依赖）

`public/dictionaries/words/source.json` 保存获取时间和原始目录快照，
`src/data/vocabulary-catalog.json` 保存每本词典的来源、实际词数、跳过的无释义词条及 SHA-256。
以实际页面使用的资源服务器目录为准；站点根目录 `/list/word.json` 是不同的旧目录。

转换保留单词、释义、英美音标，合并同一本词典中重复词条的释义，
跳过缺少单词或释义的数据；未导入例句、词源等当前应用未使用的字段。
原有 CET4_T 和 CET6_T 的内容与顺序保持不变，以兼容已保存的学习进度。
词库文件作为本地静态资源按需加载，不在用户练习时请求 TypeWords 服务器。

上游项目代码标注 GPL-3.0，许可证副本见 `TypeWords-LICENSE`。
公开词典资源中未提供独立数据许可证；此处记录来源，不将项目代码许可等同于对所有教材、词典内容的授权。
后续公开分发或商业使用前，应确认各数据来源的使用授权。
