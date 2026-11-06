# AGENTS.md — Sentence Quest / SentLeap

本文件为仓库内开发代理的协作指南，适用于整个项目。进入子目录后还需遵守该目录的 `AGENTS.md`；Web 的额外 UI 规范见 `web/AGENTS.md`。以用户当前任务为修改范围，不顺带重构无关代码。

## 项目概况与目录

SentLeap 是以中文提示、逐词拼写、即时反馈、错题复习和 XP 为核心的英语学习应用。Web 与微信小程序共用部分数据与规则，但各自保存学习进度，目前没有账号与跨设备同步。

| 路径 | 职责 |
| --- | --- |
| `web/` | Next.js 16、React 19、TypeScript、Tailwind CSS Web 应用，独立依赖与部署目录 |
| `web/src/app/` | App Router 页面、布局、发音与反馈等 API Route Handler |
| `web/src/components/`、`web/src/hooks/` | 界面组件、练习交互与状态管理；基础 UI 位于 `components/ui/` |
| `web/src/data/`、`web/public/dictionaries/` | 权威练习数据、词库目录和按需加载的词库 JSON |
| `web/src/utils/` | 校验、XP、存储、错题、历史与发音等规则 |
| `web/scripts/` | Web 数据校验与回归测试 |
| `miniprogram/` | 原生 TypeScript + WXML + WXSS 微信小程序，由开发者工具编译 |
| `miniprogram/pages/`、`miniprogram/utils/` | 页面及题库、云接口、存储、练习、发音等逻辑 |
| `miniprogram/data/` | 同步脚本生成的内置题库与目录 |
| `cloud-service/` | Hono + TypeScript 云托管服务，提供发音、题库读取及管理员接口 |
| `scripts/` | 跨端同步、云题库上传和小程序测试 |

开始修改前阅读目标端 README、相关实现与测试。文档与代码冲突时核对 `package.json`、同步脚本和调用链，不沿用过期描述：当前小程序使用 `.ts`，内置精选短语、句子闯关、三个单词的测试库，在线接口通过云托管访问。

## 安装与运行

- 根目录及 Web 声明 Node.js `>=20.9.0`、`pnpm@9.15.9`；云服务依赖独立管理，部署运行时参考其 Dockerfile。
- 根目录安装工具依赖：`npm ci`。Web 按现有说明执行 `pnpm --dir web install`。云服务执行 `npm --prefix cloud-service ci`。
- 仓库不是统一依赖安装的 workspace；根目录安装不能替代 Web 或云服务安装。沿用目标目录的包管理方式，不无故切换工具、升级依赖或重写多份 lockfile。
- 根目录 `npm run dev`、`npm run build`、`npm run start` 转发至 Web。Web 环境变量放在 `web/.env.local`，部署项目根目录为 `web/`。
- 微信开发者工具导入 `miniprogram/`，使用 TypeScript 编译插件，无需在工具中构建 npm。云环境与服务名配置位于 `miniprogram/config.ts`。
- 云服务执行 `npm --prefix cloud-service run build` 后以 `npm --prefix cloud-service start` 启动；默认端口 8080，健康检查路径 `/health`。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目注释规范

- 后续新增或修改页面时，在页面代码文件开头用中文概述页面用途、主要功能和数据来源；小程序 WXML 页面文件开头简述页面用途。
- 后续新增或修改的函数、页面组件、辅助函数、生命周期函数和事件处理函数，在作用、参数、返回值、业务限制或副作用不够直观时添加简洁中文注释说明。
- 注释应与实现保持一致，逻辑变化时同步更新；避免为简单、显而易见的代码添加冗余注释。
- 以上规范适用于整个项目的后续开发；已有代码在修改时逐步补充，无需为遵循此规范批量改写无关文件。

## 代码格式规范

- 整个项目后续新增或修改的代码都必须格式化，沿用所在目录已有的格式化工具和配置；没有工具配置时，按照项目现有风格手动整理。
- 使用一致的缩进和空行区分逻辑段落；每行原则上只写一条语句，函数体、条件分支和循环使用清晰的多行结构。
- 较长的条件、参数、对象和类型定义应合理换行，避免将多个步骤压缩在一行，保证代码易于阅读和维护。
- 提交前检查本次修改的格式和注释；已有文件逐步随修改整理，无需批量格式化无关代码或生成文件。

## Web 开发约定

- 编写 Next.js 代码前，按上方规则阅读当前安装版本的对应指南；本仓库优先查找 `web/node_modules/next/dist/docs/`，不要直接套用旧版路由、缓存或参数 API。
- 保持页面、交互状态、业务规则与持久化分层。复用已有 hooks、工具和数据模型；使用 Web 已配置的 `@/` 路径别名。
- 遵守服务端与客户端边界；访问浏览器存储、音频和 DOM 时考虑 SSR 与初始化时机。
- 交互控件优先复用 `src/components/ui/` 的 shadcn/ui / Radix UI 封装，具体规则见 `web/AGENTS.md`。保留键盘操作、焦点管理、禁用状态和可访问性标签。
- Web 进度以 IndexedDB 等现有存储机制为准；维护加载恢复、串行写入、迁移和内存降级，不因读取异常清空或覆盖旧存档。
- 当前 PWA 仅缓存离线提示页，不是完整离线练习版。修改离线页需同步更新 `web/public/sw.js` 缓存版本；不得误清理学习存储或强制刷新练习页面。

## 数据来源与跨端同步

- Web 数据和共享规则是同步源。修改源文件或同步逻辑后，在根目录运行 `npm run sync:miniprogram`，检查并随修改提交相关生成文件。
- 当前生成目标为 `miniprogram/data/{catalog,home-phrases,sentences,vocabulary-dev-test}.ts` 和 `miniprogram/utils/{validator,practice-xp}.ts`。具体映射以 `scripts/sync-miniprogram.mts` 为准。
- 不手工维护生成文件中的逻辑，不为格式规范批量重排生成数据；需要改变输出时修改源或生成器。
- `miniprogram/utils/catalog.ts` 是手写的运行时加载模块，与生成的 `miniprogram/data/catalog.ts` 不同。
- 题库 ID、题目 ID 和条目顺序关联已有进度。更新题库必须评估兼容性，避免随意重命名、排序或重建标识。
- 保留题库来源与授权记录，参阅 `web/docs/third-party/TypeWords.md`；不要将完整 Web 静态词库直接打进小程序包。

## 小程序题库与云端契约

修改 `miniprogram/utils/catalog.ts`、上传工具或云服务时，检查以下契约是否仍一致：

- 内置库可离线练习；云端目录不得覆盖同 ID 内置库。先恢复缓存目录，再刷新云端；失败时保留已有目录。
- 目录条目校验 ID、名称、分类、`kind`（`word` / `phrase`）、正整数 `wordCount` 与 SHA-256 字段。不要用未校验的外部内容直接驱动练习。
- 目录缓存键为 `sentleap:cloud-catalog:v1`；题库缓存键为 `sentleap:dictionary:${listId}:${sha256}`。内存与持久化缓存按版本隔离。
- 内容接口携带 `offset` 与 `version`；校验响应版本、`items` 和 `next`。下一偏移必须严格前进且与本页数量一致，`null` 表示结束；总条数须与目录一致，避免无限分页或加载不完整数据。
- 原始单词通过 `name`、`trans` 等字段转换为练习条目，转换后的 ID 使用题库 ID 与原始顺序。短语数据须满足 `id`、`zh`、`english`、非空 `words` 等现有校验要求。
- SHA-256 当前用于版本标识和缓存隔离；不要将版本字段一致性校验描述为客户端重新计算了内容哈希。
- 缓存空间不足不能阻止本次练习；目录、下载或格式错误应沿调用链得到处理。修改缓存策略时保持离线回退。
- 小程序使用 `wx.cloud.callContainer` 访问 Hono 服务；服务名通过 `X-WX-SERVICE` 传递。发音返回 Base64 并写入临时文件，保留页面退出时的清理行为。

## 学习进度与交互约束

- 小程序学习存储键为 `sentleap:miniprogram:v1`，与题库缓存、Web 存储相互独立。变更结构应考虑历史数据兼容，不自动覆盖损坏记录。
- 首次掌握获得 10 XP，首次无错误且未用提示额外获得 5 XP；重复完成不得重复发放。以共享实现和回归测试为准。
- 拼错、提示、跳过进入错题；独立正确完成复习后移除。修改相关流程时核对练习页、复习页、统计和持久化是否一致。
- 输入统计按新增或替换字符记录；删除和字母提示不计输入次数。不凭空补造旧版本历史。
- UI 修改检查小屏、长句、长词、滚动、底部安全区与微信胶囊避让；小程序悬浮底栏与原生 TabBar 的显示恢复需一致。
- 本地昵称不代表登录，学习提醒尚未接入订阅消息。界面文案不得声称已提供未实现的同步、提醒或离线能力。

## 云服务与敏感配置

- 题库资料保存在云托管 MySQL，通过 Drizzle ORM 和 `mysql2` 访问；题库 JSON 存储在云托管对象存储 COS，服务端通过开放接口获取临时凭据并写入必需的文件元数据。服务端通过数据库登记的 `fileID` 获取题库，不接受客户端指定任意对象存储路径。目录与内容读取须保持发布状态过滤。
- 元数据更新和下架接口使用服务端 `DICTIONARY_ADMIN_TOKEN` 鉴权；Swagger 上传接口暂不鉴权，部署时必须限制公网访问或增加保护。保持参数校验、请求大小限制及错误响应。删除题库为归档，不直接删除云文件。
- 上传脚本默认校验与预览；`--upload` 才写入云存储和数据库。未经任务授权，不为本地验证上传、部署或修改真实云数据。
- 上传文件与数据库登记不属于一个事务；保持失败诊断与可重试性，不擅自清理可能被复用的文件。
- 密钥、AppSecret、管理员令牌仅通过服务端或本机环境配置，不写入源码、小程序、日志或提交内容。云环境 ID 不等同于密钥。
- 配置与部署细节查阅 `miniprogram/README.md` 和 `cloud-service/README.md`；不要为绕过失败关闭现有网络或鉴权校验。

## 验证命令与验收

以下命令从仓库根目录执行，按改动范围选择：

| 改动范围 | 验证 |
| --- | --- |
| Web 类型与路由 | `npm run typecheck` |
| Web 数据 | `npm run check:data` |
| 学习、存储、错题、历史等规则 | 对应 `test:review`、`test:storage`、`test:notebook`、`test:selection`、`test:history`、`test:id` |
| Web 冒烟、反馈、PWA | 对应 `test:smoke`、`test:feedback`、`test:pwa` |
| 小程序及根目录工具 | `npm run typecheck:miniprogram`、`npm run test:miniprogram` |
| 题库上传 | `npm run test:dictionary-upload` |
| Web 与小程序综合检查 | `npm run check` |
| Web 生产构建 | `npm run build` |
| 云服务 | `npm --prefix cloud-service run build`、`npm --prefix cloud-service test` |

- 根目录 `check` 不包含云服务测试或 Web 生产构建，涉及这些范围时补充执行。
- 小程序 Node 测试模拟微信 API，不能替代开发者工具编译与真机验收；云数据库、云存储、网关和发音上游需要真实环境验证。
- 行为变更优先补充现有测试体系中的相关回归用例；不要只测试实现细节。纯文档修改检查事实、链接与差异即可。
- 明确区分已执行、未执行与环境阻塞的验证，不声称未运行的检查已通过。

## 交付前检查

- 开始与结束时查看 `git status`、相关 diff，保留用户已有修改，不覆盖或回滚无关工作。
- 检查本次代码的中文注释、格式、生成文件一致性和数据兼容性；运行 `git diff --check` 排除空白错误。
- 功能、接口、配置或命令变化时同步更新对应 README；避免保留与实际代码矛盾的操作说明。
- 不提交依赖目录、构建产物、临时文件、个人开发配置或敏感环境文件，不无故修改锁文件。
- 交付说明写明改动、验证结果及尚需人工或真实环境确认的事项；未经请求不创建提交或发布。
