# SentLeap · 一词一跃，玩会英语

SentLeap 是一个以主动回忆和逐词拼写为核心的英语学习应用，将中文提示、即时输入反馈、英美发音与学习记录结合起来，覆盖单词记忆、常用表达和句型练习。无需注册即可开始，学习进度自动保存在当前浏览器。

基于 **Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 3** 构建，采用本地优先的数据架构，以原生 IndexedDB 保存学习进度，通过 Next.js Route Handler 提供发音代理。

## 项目亮点

- **完整的练习闭环**：看中文回忆英文，逐字输入并即时反馈，拼对后自动推进；支持字母提示、跳过、前后切换和发音播放。
- **丰富的学习内容**：当前仓库收录 193 本词典、269,674 个可练习词条（不同词典之间可能重复），另提供 900 条场景表达和 1,000 条基础句型，首页可直接体验 20 条精选短语。
- **持续学习反馈**：各词库独立记录已掌握单词与练习位置，结合 XP、连对计数和每日学习热力图展示学习积累。
- **面向实际故障的存储设计**：异步恢复、串行写入、旧存档迁移、操作超时和内存降级共同保护学习流程；加载失败时展示明确提示，不自动清空已有存档。
- **按需加载与资源复用**：进入练习后再加载对应词库；发音请求支持并发去重与有容量上限的缓存，减少重复请求。
- **可验证的工程实现**：提供题库校验、冒烟测试、存储回归测试与 TypeScript 类型检查；界面、学习逻辑、数据校验和持久化职责分离。

## 功能与页面

| 入口 | 功能 |
| --- | --- |
| `/` | 20 条精选短语，按中文提示逐词拼写 |
| `/settings` | 学习内容标签支持搜索词库、短语或句型，以及内容分类筛选；练习设置标签可启用或禁用字母提示 |
| `/practice/[listId]` | 加载指定词库，提供独立进度、词条搜索、拼写与发音 |
| `/practice/[listId]?category=…` | 进入场景表达或基础句型的指定分类 |
| `/api/pronunciation` | 服务端获取并代理单词或整句音频 |

句子练习组件支持音标、词性、中文释义和句子成分分组展示；通过语法卡片解释句子结构。拼写校验兼容大小写、常见标点、短语空格及重音字母的普通字母输入。

字母提示默认启用，可在「设置 → 练习设置」关闭。此偏好保存在当前浏览器的 localStorage 中，对单词、短语和句子练习统一生效；关闭后隐藏“多给一个字母”按钮。

## 技术栈

以下版本对应 `package.json` 中声明的主要版本。

| 技术 | 项目中的用途 |
| --- | --- |
| Next.js 16 / App Router | 页面路由、动态练习入口、服务端参数校验与发音 Route Handler |
| React 19 | 交互界面、组件复用与 Hooks 驱动的学习状态管理 |
| TypeScript 5.9 | 题库、学习进度、组件参数与仓储接口的类型约束 |
| Tailwind CSS 3.4 / PostCSS | 响应式布局、样式工具类与主题变量 |
| shadcn/ui / Radix UI | 按钮、输入、选择器、弹窗、卡片与进度条等基础组件 |
| cmdk / Lucide React | 词汇搜索命令菜单与界面图标 |
| 原生 IndexedDB | 浏览器本地学习进度持久化，无需额外数据库服务器 |
| HTMLAudioElement / Web Speech API | 音频播放与浏览器语音合成回退 |
| Node.js / Python 3 | 数据校验、回归测试与词典同步脚本 |

共享 UI 组件位于 `src/components/ui`，采用 New York 风格和 CSS 变量主题；`src/lib/utils.ts` 中的 `cn()` 负责合并类名。主题变量定义在 `src/app/globals.css`，映射位于 `tailwind.config.ts`，路径别名为 `@/`。

## 核心架构

### 学习状态与持久化

```text
练习界面（单词 / 短语 / 句子）
  → useSentenceGame（学习状态、积分、统计与进度恢复）
  → storage.ts（数据规范化、旧存档迁移、串行保存队列）
  → ProgressRepository（统一读写契约）
  → IndexedDbProgressRepository（浏览器持久化）
```

数据库名为 `sentleap`，版本为 `1`，通过 `progress` Object Store 保存进度，主键为 `profileId`。当前匿名档案使用 `guest`；记录包含 `schemaVersion`、`revision` 和 `updatedAt`，进度内容包括已完成句子、错误次数、积分、每日活动及各词库学习位置。

页面挂载后异步恢复存档，恢复完成前禁止练习操作，避免初始空状态覆盖旧记录。连续更新通过保存队列按提交顺序写入。数据库打开与读写事务设置 **4 秒超时**，学习状态初始化另有 **9 秒兜底**；失败后进入内存模式，迟到的读取不会覆盖已经开始的练习。

旧数据迁移支持 `sentence-quest` IndexedDB 和 `localStorage['sentence-quest-progress-v1']`：目标库已有档案时不覆盖；localStorage 记录仅在写入成功后移除，旧 IndexedDB 保留。

持久化接口定义在 `src/repositories/progress.ts`：

```ts
interface ProgressRepository {
  load(profileId: string): Promise<Progress | null>;
  save(profileId: string, progress: Progress): Promise<void>;
}
```

后续可通过新增仓储实现接入远端存储。账号体系、云端同步与冲突合并尚未实现，演进设计见 [数据库演进规划](docs/database-roadmap.md)。

### 词库加载

词典目录由 `src/data/vocabulary-catalog.json` 提供，词库 JSON 存放在 `public/dictionaries/words/`。进入指定词库后按需请求对应文件，并校验词条数量；加载失败可在页面重试。练习时读取本站静态资源，无需实时访问词典来源站点。

场景表达与基础句型的分类配置位于 `src/data/phrase-practice.ts`，首页精选内容位于 `src/data/home-phrases.json`。

### 发音链路

```text
客户端请求 → /api/pronunciation → 音频上游 → 代理返回音频
     ↓ 获取或播放失败
浏览器 Web Speech API
```

- 支持英音（`type=1`）和美音（`type=2`），例如 `/api/pronunciation?word=coffee&type=2`。
- 默认在服务端生成签名并请求有道音频；客户端不负责生成签名。
- 页面内按文本和口音缓存音频，采用 LRU 淘汰策略，上限为 **64 条 / 16 MiB**；相同的进行中请求共用 Promise。
- 音频响应设置 **2 小时浏览器缓存**，服务端请求上游设置 **8 秒超时**。
- 切换播放时释放旧音频资源，并防止过期请求打断当前播放。

## 本地运行

环境要求：**Node.js 20.9+**，项目声明包管理器为 **pnpm 9.15.9**。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

访问 `http://localhost:3000`。默认发音配置无需环境变量。

如需接入自有发音服务，在 `.env.local` 中配置：

```bash
PRONUNCIATION_UPSTREAM_URL=https://your-audio-provider.example.com/pronounce
```

服务端会向该地址附加 `word` 和 `type` 参数，期望上游返回音频内容。

## 校验与构建

```bash
pnpm check
pnpm build
pnpm start
```

`pnpm check` 依次运行以下检查，也可以单独执行：

| 命令 | 检查内容 |
| --- | --- |
| `pnpm check:data` | 句子标注、语法分组、词库数量、词条唯一性及释义与音标字段 |
| `pnpm test:smoke` | TypeScript 转译、拼写校验、键盘输入等核心逻辑回归 |
| `pnpm test:storage` | 旧存档迁移、写入顺序、故障降级、打开或事务挂起、多标签页阻塞 |
| `pnpm test:feedback` | 反馈接口校验、来源限制、请求大小、存储响应与限流失败处理（模拟上游） |
| `pnpm typecheck` | Next.js 类型生成及 TypeScript 静态类型检查 |

存储测试使用模拟 IndexedDB；实际浏览器的权限、配额与持久化行为仍需在目标环境验证。

## 部署

项目可部署到 Vercel 或支持 Next.js Node.js 运行时的平台。发音接口依赖 Route Handler，部署时使用完整 Next.js 服务。

在 Vercel 导入仓库后，选择 **Next.js** 框架和项目根目录，安装命令使用 `pnpm install --frozen-lockfile`，构建命令使用 `pnpm build`，输出目录保留默认值。仅接入自有发音服务时需要配置 `PRONUNCIATION_UPSTREAM_URL`。

自托管时执行 `pnpm build`，再以 `pnpm start` 启动生产服务。

## 项目结构

```text
src/
├── app/
│   ├── page.tsx                       # 首页精选短语
│   ├── practice/[listId]/page.tsx      # 单词与分类表达练习路由
│   ├── settings/                      # 学习内容搜索、筛选与选择
│   └── api/pronunciation/route.ts      # 发音代理
├── App.tsx                            # 单词练习主界面
├── components/
│   ├── SentencePracticeApp.tsx        # 句子 / 短语练习界面
│   ├── VocabularyModule.tsx           # 单词拼写交互
│   ├── ActivityHeatmap.tsx            # 每日学习统计
│   └── ui/                            # 共享 UI 组件
├── hooks/useSentenceGame.ts           # 学习状态与进度恢复
├── data/                              # 题库、词典索引与表达分类
├── repositories/                      # 存储接口与 IndexedDB 实现
├── types/game.ts                      # 学习数据类型
└── utils/                             # 存储、发音、输入校验与统计
public/dictionaries/words/             # 按需加载的词库与表达数据
scripts/                              # 数据检查、测试与同步脚本
docs/                                 # 数据来源与数据库演进说明
```

## 内容维护

句子题库 `src/data/sentences.json` 中，每道题包含稳定的 `id`、中文提示、英文原句和 `words`，以及以下教学字段：

- `annotations`：与 `words` 一一对应，包含音标、释义、词性和颜色。
- `grammar`：包含成分角色、起止词索引、颜色和解释；索引从 0 开始，左闭右开，分组需连续覆盖整句。
- `note`：整句语法概要。

学习记录与错题依赖题目 ID，更新内容时应保留已有 ID，避免将旧 ID 用于不同题目。修改后运行 `pnpm check:data`。

词典同步使用 `python3 scripts/sync-typewords.py`（需要网络），同步后运行 `pnpm check`。数据来源与许可说明见 [词典数据说明](docs/third-party/TypeWords.md)。

## 存储与使用说明

- 学习记录保存在当前浏览器，暂不支持账号登录或自动跨设备同步。
- IndexedDB 与 localStorage 按站点来源隔离；不同域名、协议或端口之间不会自动共享存档。
- 本地保存进度不等于完整离线应用：首次访问、未加载词库及在线发音需要网络；浏览器语音回退取决于设备支持。
- 清除站点数据、更换浏览器或使用无痕模式可能导致存档丢失。
- 若出现内存模式提示，可检查浏览器存储权限、关闭同站点旧标签页后重试；本次新增进度刷新后可能丢失，请勿为排障直接清空存档。

## 用户反馈（Upstash Redis）

所有页面右下角提供反馈入口，支持问题反馈、功能建议和其他反馈，联系方式选填。通过服务端 `/api/feedback` 写入 Upstash，浏览器不接触数据库凭据；无需注册登录。

### 连接配置

1. 在 [Upstash 控制台](https://console.upstash.com/) 创建 Redis 数据库。
2. 在数据库的 REST API 区域复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`，Token 使用可读写的标准 Token，不能用 Read Only Token。
3. 将 `.env.example` 复制为 `.env.local`，填入这两个值；已有 `.env.local` 时只追加配置，不要覆盖。该文件已被 Git 忽略，不要提交或公开 Token。
4. 重启开发服务。部署到 Vercel 时，在项目环境变量中设置相同的两个变量，然后重新部署。不要使用 `NEXT_PUBLIC_` 前缀。

连接采用 [Upstash REST API](https://upstash.com/docs/redis/features/restapi)，不需要提供 Redis TCP 地址、端口或单独的账户密码。未配置时仍可打开反馈表单，提交会提示服务暂未配置，不会显示虚假的成功状态。

### 查看与保存规则

在 Upstash 控制台的数据浏览器中查看 Hash 键 `sentleap:feedback`：每个字段为反馈 UUID，值为 JSON，包含类型、内容、联系方式、页面路径、提交时间及初始状态 `new`。反馈不设置过期时间；当前没有公开查询接口或管理页面。

内容最多 2,000 字，联系方式最多 200 字。服务端限制请求体大小、校验来源，并通过 Redis 原子脚本去重和限流；同一内容的失败重试复用提交 ID。页面地址仅记录路径，不保存查询参数。Vercel 部署按平台提供的 IP 做哈希限流，每 10 分钟最多 5 条；其他部署默认共享该限额，如需按 IP 区分，应先配置可信反向代理。全站另设每 24 小时最多 100 条的保护上限（从首次成功提交起计时），限流键到期自动删除。

配置完成后可提交一条测试反馈，并在控制台核对对应记录。接口超时或存储失败会保留表单内容，供用户重试。

## 项目进度环

每个练习项目显示一个简洁的进度环，蓝色长度表示整体掌握比例，灰色表示剩余进度，并显示已掌握数量和百分比。环内保留练习统计，不再展示刻度或悬停内容。

进度读取当前项目已保存的掌握记录，切换项目、刷新页面或重置练习时同步更新，重复练习不会重复计数。

学习历史仍保存在浏览器 IndexedDB 中，保留最近 1800 条，但不限制进度环的项目统计范围。为兼容旧数据沿用 `sentleap-rewards` 数据库名称；学习奖励功能已移除。

`pnpm test:history` 验证轨迹去重、容量限制、旧数据兼容、并发保存、重新打开与超时处理。
