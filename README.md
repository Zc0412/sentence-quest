# SentLeap v2.2 — Next.js + IndexedDB（初始化超时修复）

参考 Earthworm 输入手感、从零开发的英语逐词输入小游戏。

- **Next.js App Router + React + TypeScript + Tailwind CSS**
- **shadcn/ui** integrated: Buttons, inputs, selectors, dialogs, cards, badges, progress indicators, and the vocabulary command menu use reusable components in `src/components/ui`
- 首页提供独立词库选择；选择 CET-4 T 或 CET-6 T 后进入对应练习路由，词库按需加载
- 无可见的传统输入框；在单词位置直接输入、逐字反馈、拼对自动切换下一词
- 支持英美音发音、释义回忆、逐字提示、顺序切换和各词库独立的学习进度
- 浏览器 **IndexedDB** 离线持久化，首次自动迁移旧版 localStorage 数据
- **v2.2 修复加载卡死**：数据库打开和读取/写入事务有 4 秒超时，初始化另有 9 秒最终保护；失败后退出加载页进入内存模式，显示保存风险，绝不自动清空原 IndexedDB
- 保留 Next.js `/api/pronunciation`，通过有道音频地址或你的独立签名服务发音
- **不需要数据库服务器**；为了未来接 PostgreSQL/Supabase，使用可替换仓储接口

## 运行

Node.js 20.9+（建议 Node 22 LTS）。安装依赖并启动：

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## shadcn/ui 组件

项目已配置 shadcn/ui（New York 风格、Lucide 图标、CSS 变量主题）和 `@/` 路径别名。共享的类名合并工具位于 `src/lib/utils.ts`，新增 UI 组件放在 `src/components/ui`：

```bash
pnpm dlx shadcn@latest add button
```

新增组件使用 `cn()` 合并 Tailwind 类名；主题 token 定义在 `src/app/globals.css`，Tailwind token 映射位于 `tailwind.config.ts`。深色 token 已预留为 `.dark` 主题，目前不会改变应用现有外观。

## 部署到 Vercel

项目使用 Next.js App Router 和 Node.js Route Handler，可直接部署到 Vercel，无需静态导出或额外数据库。

1. 将项目推送到 GitHub、GitLab 或 Bitbucket。
2. 在 Vercel 选择 **Add New → Project** 并导入该仓库。
3. Framework Preset 选择 **Next.js**，Root Directory 使用项目根目录。
4. 使用默认构建设置，或确认 Install Command 为 `pnpm install --frozen-lockfile`、Build Command 为 `pnpm run build`。Output Directory 保持 Next.js 默认值，不要启用静态导出。
5. 点击 **Deploy**。项目已声明 pnpm 9.15.9 与 Node.js 20.9+；无需配置环境变量即可使用有道发音接口。

部署后，学习记录保存在访问者当前浏览器的 IndexedDB 中，不会自动同步到其他设备或域名。`/api/pronunciation` 使用 Vercel Node.js Function 请求有道并代理音频，因此不要将应用配置为纯静态站点。只有接入自有发音上游时，才需要在 Vercel Project Settings → Environment Variables 设置 `PRONUNCIATION_UPSTREAM_URL`；普通使用请留空。

正式构建和检查：

```bash
npm run check:data
npm run test:smoke
npm run test:storage
npm run typecheck
npm run build
npm run start
```

> `npm run test:storage` 通过模拟 IndexedDB 验证旧版迁移、异步写入顺序、不可用降级及 **open 卡住 / 事务卡住 / 多标签页阻塞**；正式构建与浏览器实际测试仍需要安装 npm 依赖，在真实浏览器验证离线持久化。项目**没有**增加 Dexie 等 IndexedDB 第三方依赖。

## IndexedDB 数据结构

数据库名：`sentence-quest`，初始版本 `1`。

| Object Store | 主键 | 保存内容 |
| --- | --- | --- |
| `progress` | `profileId` | `progress`、`schemaVersion`、`revision`、`updatedAt` |

当前匿名玩家使用 `profileId = 'guest'`。进度快照字段：

```ts
interface Progress {
  completedIds: string[]; // 已完成的稳定句子 ID
  xp: number;
  mistakes: Record<string, number>; // 句子 ID -> 错误次数
  totalCorrectWords: number;
  perfectSentences: number;
}
```

**保存流程**：React 状态 → `src/utils/storage.ts`（规范化、迁移、串行队列）→ `ProgressRepository` 接口 → `IndexedDbProgressRepository` → IndexedDB。页面挂载后异步加载进度；加载完成前不允许执行游戏操作，也不会将初始空进度覆盖原存档。连续更新按提交顺序入库。

**旧版 v2.0 存档自动迁移**：

1. 优先尝试读取 IndexedDB 中的 `guest` 记录；有记录则直接使用它。
2. 如果没有记录，尝试读取当前站点同源的 `localStorage['sentence-quest-progress-v1']`。
3. 先把旧记录写入 IndexedDB 并等待事务完成，成功后才删除 localStorage 旧记录。
4. 数据库被禁用或保存失败时**不会删除旧副本**。游戏可以暂时在内存里运行，但会显示无法持久保存的警告。

**注意同源限制**：IndexedDB 和 localStorage 均按 origin 隔离。原项目若在 `localhost:5173`，新项目在 `localhost:3000`，即使都是 localhost，也**不会自动访问到旧站点的浏览器记录**。部署到不同域名也是一样。跨源迁移以后可以另做导出 / 导入数据功能。

## 核心目录

```text
src/
├── app/
│   ├── page.tsx                      # App Router 首页
│   ├── layout.tsx                    # 页面元信息
│   ├── globals.css
│   └── api/pronunciation/route.ts    # 发音 API 路由
├── App.tsx                           # 游戏主界面（client）
├── components/                      # 句子闯关、词汇卡片、输入与进度组件
├── hooks/useSentenceGame.ts         # 游戏逻辑 / IndexedDB 异步初始化
├── data/sentences.json              # 句子题库
├── data/vocabulary-catalog.json     # 词典索引（词库文件位于 public/dictionaries/words）
├── types/game.ts                    # Progress 等类型
├── repositories/
│   ├── progress.ts                   # 可替换的持久化接口
│   └── indexeddb-progress.ts         # 原生 IndexedDB 仓储实现
└── utils/
    ├── storage.ts                   # 迁移 / 校验 / 保存队列
    ├── speech.ts                    # 发音处理
    └── validator.ts                 # 单词校验
```

单词模块使用 `public/dictionaries/words/*.json`，包含单词、中文释义和英美音标。学习者根据中文释义逐字输入英文单词，拼对后自动进入下一个词；也可以搜索定位、播放发音或跳过。答对的单词和词表位置会保存，每次拼对都会计入每日学习热力图。词库由 `npm run check:data` 检查单词唯一性、释义及音标字段。

## 为后续云数据库做了什么？

`ProgressRepository` 定义了存储契约：

```ts
interface ProgressRepository {
  load(profileId: string): Promise<Progress | null>;
  save(profileId: string, progress: Progress): Promise<void>;
}
```

目前使用 `IndexedDbProgressRepository`，**未来可以实现远端同步服务，而无需改打字组件和闯关逻辑**。仓储记录包含稳定的 `profileId`、`schemaVersion`、`revision` 和 `updatedAt`，用于为迁移、用户身份和同步版本提供基本信息。这**不代表已经实现云端同步或冲突合并**。

推荐逐步演进：

1. **现在**：JSON 题库 + IndexedDB，匿名用户离线学习。
2. **增加账号后**：Next.js API + PostgreSQL / Supabase，服务端存正式用户进度。不要在客户端暴露数据库密钥。
3. **离线同步时**：为每次完成句子、答错和复习新增带唯一事件 ID 的 `learning_events` 表及本地待同步队列，登录后用幂等 API 上传。服务器确认后才清除队列。
4. **多设备同步**：已完成句子的集合可按 ID 合并；XP、错误次数、完美通关等应从去重事件计算，**不要直接相加两个设备的进度快照**，否则重复同步会导致统计错误。
5. **登录迁移**：匿名 `guest` 进度需要用户明确选择合并到账号，避免覆盖同一账号已有的云端进度。

更多细节参阅 [数据库演进规划](docs/database-roadmap.md)。

## 发音 API

客户端请求 `/api/pronunciation?word=coffee&type=2`。服务端会按当前单词和口音动态生成签名，请求有道 `/pronounce/base` 并代理返回音频；同一页面内已经获取的单词或句子音频会按文本和口音缓存，重复播放不再请求接口，浏览器也会缓存音频两小时。若获取失败则回退浏览器 TTS。`type=1` 为英音，`type=2` 为美音。

如果你有可以按词动态生成签名的服务，可设置 `.env.local`：

```bash
PRONUNCIATION_UPSTREAM_URL=https://your-audio-provider.example.com/pronounce
```

Next.js 会向该上游附加 `word` 和 `type`，期待返回音频。生产使用第三方音频须确认相应许可、调用频率和可用性。此功能需要支持 Route Handlers 的部署方式，不能使用纯静态导出。

## 句法卡片与语法说明

输入和完成界面共用句法卡片：顶部是句子成分标签，每词显示音标、英文、词性颜色、中文释义与词性。输入时隐藏未完成的英文，拼对自动进入下一词；完成后展示完整句子。首页固定为一屏，语法说明通过“整句／主语／谓语”等按钮切换；窄屏下分组会换行并紧凑显示。输入区不显示光标，桌面端在空白处或普通按钮失焦后直接敲字即可继续输入，弹窗和其他文本输入区域不会被抢占。

题库新增图片示例 `daily-011` 并放在第一题，原有题目的 ID 和内容保持不变。

每道题需提供 `annotations`（与 `words` 一一对应，包含 `phonetic`、`meaning`、`pos`、`color`）以及 `grammar`（包含 `role`、`start`、`end`、`color`、`explanation`）。分组使用从 0 开始、左闭右开的词索引，必须连续覆盖整句。`note` 是整句语法概要。运行 `npm run check:data` 验证数据完整性。

## 修改题库

编辑 `src/data/sentences.json`，以下是基础字段示例（还需按上一节补充 `annotations` 和 `grammar`）：

```json
{
  "id": "daily-012",
  "unit": 1,
  "category": "日常生活",
  "zh": "我正在学英语。",
  "english": "I am learning English.",
  "words": ["I", "am", "learning", "English"],
  "note": "be + 动词 -ing 用于现在进行时。"
}
```

务必保留题目的稳定 `id`（例如 `daily-001`），不要随意复用已有 ID：学习记录与错题本依赖它。

## 当前约束

- 当前是本地离线优先 MVP，没有用户登录、云数据库或自动多设备同步。
- 如果清除网站数据、使用无痕模式或更换浏览器，本地存档可能丢失。
- 浏览器存储配额与隐私设置由浏览器决定；出现 IndexedDB 保存失败时 UI 会明确提示。
- 本项目玩法独立实现，没有复制 Earthworm 源码。

## v2.2 修复说明：一直卡在“正在从 IndexedDB 恢复学习进度”

旧版 `openGameDatabase()` 及读取事务没有截止时间。如果浏览器存储层无法触发完成或失败事件，React 的 `hydrated` 将永远是 `false`。

此版本修复：

- `src/repositories/indexeddb-progress.ts`：数据库打开和读写事务均设置 4 秒看门狗；被阻塞立即退出；失败后清理缓存以便下次重试。
- `src/hooks/useSentenceGame.ts`：9 秒兜底，确保无论存储 API 发生什么异常都能进入游戏；迟到的读取不会覆盖用户在内存里练过的题。
- 加载失败时优先读取旧 localStorage，**不删除现有 IndexedDB 记录或旧存档**，提示“本次进度无法持久化”。
- `npm run test:storage`：新增三种挂起/阻塞场景的模拟测试。

如果页面进入了“内存模式”并出现红色提示，说明浏览器本次无法可靠读写 IndexedDB。**先不要点击清空学习记录，也不要急着清站点数据。** 请在浏览器开发者工具 Console 检查错误，确认浏览器允许站点存储，关闭同域的其他旧标签页，然后重新加载。内存模式练习的新增进度刷新后可能丢失。


## TypeWords 词典集成

- `/settings` 的“词典”页面：浏览、搜索及按类别 / 教材系列筛选全部 194 本词典。
- 练习页点击词库名称或设置按钮，即可进入词典列表。
- `/practice/[listId]`：按需加载本地词库，每本词库独立保存进度。
- 数据文件：`public/dictionaries/words/*.json`；目录：`src/data/vocabulary-catalog.json`。
- 当前快照共 272,281 个可练习词条（不同词典之间可能重复），缺少释义的源词条已记录在目录的 `skippedWords`。
- `python3 scripts/sync-typewords.py` 可重新同步公开目录，需要网络；同步后运行 `npm run check`。
- 保留原有四级、六级的 ID、词条顺序和学习记录。支持短语空格、数字、标点及重音字母的普通字母输入。
- 来源与许可说明见 [TypeWords 数据说明](docs/third-party/TypeWords.md)。上游项目代码许可不等同于各词典内容的独立授权。
