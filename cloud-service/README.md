# SentLeap 云托管服务

Hono + TypeScript 服务提供发音、云端题库目录和 JSON 内容接口。Swagger UI 可粘贴 JSON 请求体或选择 JSON 文件创建题库；替换已有题库 JSON 仍需使用仓库根目录的 `npm run upload:dictionary`。未设置 `status` 的历史记录视为可见；设置为 `published` 可发布，其他状态不会通过接口返回。

## 部署

1. 在微信云托管开通 MySQL 服务，并为本地命令配置数据库服务器可达的 MySQL 环境变量。首次初始化时可在 `cloud-service/service/` 运行 `npm run db:setup`：该命令先创建 `.env` 指定的数据库（若不存在），再应用 Drizzle 迁移。初始化账号必须有 `CREATE DATABASE` 权限；服务运行账号不需要此权限。已有数据库仅需运行 `npm run db:migrate`。后续修改 schema 后运行 `npm run db:generate` 生成迁移，检查生成的 SQL 后提交，再在目标环境运行 `npm run db:migrate`。不要对已有题库数据的数据库直接运行尚未核对的迁移。
2. 在云托管控制台将仓库的 `cloud-service` 目录作为构建目录，用其中的 Dockerfile 创建服务；服务名需与小程序配置一致，当前为 `sentleap-service`。将云托管服务配置中的容器端口设置为 `8080`，并确保 `PORT` 环境变量与容器端口一致。服务监听 `PORT`，未设置时默认使用 8080；健康检查路径为 `/health`。镜像以普通用户运行，请勿将端口设置为 80。
3. 在云托管控制台开启「开放接口服务」的对象存储能力，为服务配置 `/_/cos/getauth` 与 `/_/cos/metaid/encode` 接口并创建新服务版本；服务需要 MySQL 读写权限。配置 `WX_CLOUD_ENV_ID`、`COS_BUCKET`、`COS_REGION`（云托管控制台「对象存储-存储配置」可查）。服务通过开放接口获取短期 COS 凭据和小程序访问所需的文件元数据，再使用 COS SDK 上传、下载。请将对象存储读权限配置为小程序用户可访问，避免文件权限阻止题库读取。
4. 在 `miniprogram/config.ts` 填写关联环境 ID 和实际服务名，部署成功后在开发者工具及真机检查发音和题库。如果只有小程序调用，可以关闭云托管公网访问；浏览器后台需要 HTTPS 可访问入口，并配置实际的 ADMIN_ALLOWED_ORIGINS。
5. 根目录上传脚本与 Swagger 上传都写入云托管对象存储和 MySQL；在本机运行脚本时需在 `cloud-service/service/.env` 配置同一云托管环境、存储桶、地域及数据库连接。直接在控制台上传 JSON 不会自动登记数据库。

上传脚本保留既有数据的条目顺序和题库 ID；修改题库时应注意旧进度按 ID 与顺序对应。文件上传和数据库写入不是一个事务，失败处理参见上传工具说明。

## MySQL 配置

题库资料通过 Drizzle ORM 和 `mysql2/promise` 连接池保存到云托管 MySQL；题库 JSON 文件存储在云托管对象存储（COS），不使用 CloudBase 云开发存储。连接池使用预处理语句绑定参数。参见 [mysql2 连接池说明](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool)。

在云托管服务端设置以下环境变量（不要填写到小程序或提交真实密码）。`MYSQL_DATABASE` 可由 `db:setup` 自动创建；请区分拥有建库权限的初始化账号和日常运行账号：

| 变量 | 说明 |
| --- | --- |
| `MYSQL_HOST` | 数据库内网主机地址；也可使用 `MYSQL_ADDRESS=主机:端口` |
| `MYSQL_PORT` | 默认 3306，优先于 `MYSQL_ADDRESS` 内的端口 |
| `MYSQL_USERNAME` | 数据库账号，也兼容 `MYSQL_USER` |
| `MYSQL_PASSWORD` | 数据库密码 |
| `MYSQL_DATABASE` | 数据库名；初始化时由 `db:setup` 创建，日常运行时必须已存在 |
| `MYSQL_SSL_CA` | 可选，启用 TLS 时使用的可信 CA PEM 内容，不关闭证书验证 |

服务启动不会自动建库或迁移。生产环境建议通过受控的 `db:setup` 初始化流程或数据库管理工具建库、迁移，再给云托管运行账号授予题库和后台账号相关表的 SELECT/INSERT/UPDATE 权限，题库表还需 DELETE 权限；过期清理命令额外需要会话表及限流表的 DELETE 权限；不建议给服务运行账号长期授予 `CREATE DATABASE`。也可手动执行 `sql/001-dictionaries.sql` 创建初始表；该方式与 Drizzle 首次迁移二选一，不要在同一数据库对未登记的初始迁移重复执行。健康接口只表示进程可响应，不代表数据库已连接；用题库列表接口验证实际读库。

旧云开发存储中的 JSON 文件不会自动迁移。请使用原 JSON 及相同题库 ID 重新上传至云托管对象存储并登记到 MySQL；旧的发布状态等管理字段需要单独核对。不要在切换前删除旧记录或云文件。

本机上传脚本使用云托管开放接口获取短期 COS 凭据，不需要固定云存储密钥；需安装根目录与 `cloud-service/` 的依赖，并配置上述云托管环境、COS 桶及 MySQL。若电脑无法连接数据库内网，应在能访问 MySQL 的受控环境运行脚本；不要为此直接开放数据库公网访问。

## 图片上传测试

`POST /api/admin/upload-image` 接收 `multipart/form-data` 的 `file` 字段，支持 PNG、JPEG 文件签名，整个请求（含表单边界）最大 5 MiB。此接口需要管理员登录。部署后先在 `/swagger` 登录，再选择图片执行接口。

图片保存到 COS 的 `images/test/<随机ID>.png` 或 `.jpg`，不写入 MySQL 题库。成功返回 HTTP 201 和 `{fileID, contentType, size}`；`fileID` 为云文件标识，不是公开图片 URL。测试文件会保留在存储桶中，可在测试后通过控制台清理。只校验文件签名，不进行完整图片解码。

接口复用云托管临时凭据和文件元数据接口，需要云端配置 `WX_CLOUD_ENV_ID`、`COS_BUCKET`、`COS_REGION` 以及开放接口权限。

## 接口

- `GET /swagger`：Swagger UI 交互式 API 文档；`GET /openapi.json`：由路由 Zod schema 生成的 OpenAPI 3.0 描述。请求参数与管理员 JSON 请求体使用 Zod 校验，修改接口字段时请同步更新 schema。
- `GET /health`：健康检查。
- `POST /api/pronunciation`：JSON 参数 `{ "word": "hello", "type": "1" }`；`1` 为英音、`2` 为美音。响应包含 Base64 音频。
- `GET /api/dictionaries`：获取题库公开目录，返回 `{ dictionaries: [...] }`。
- `GET /api/dictionaries/:id`：获取已发布题库的公开资料。
- `GET /api/dictionaries/:id/content`：根据数据库登记的文件 ID 分页获取题目，参数 `offset` 和 `version` 分别为条目偏移量和目录中的 SHA-256；返回 `items`、下一页偏移量 `next`（最后一页为 `null`）和 `sha256`。不会接受客户端提供的云存储路径。

### 管理题库

除登录和邀请注册外，所有 `/api/admin/*` 接口均要求有效管理员会话，包括题库上传、元数据更新、永久删除及图片上传。使用 HttpOnly Cookie 或 `Authorization: Bearer <登录返回的 token>`。旧的 `DICTIONARY_ADMIN_TOKEN` 不再参与鉴权。小程序的 `/api/dictionaries`、详情和内容查询继续匿名访问，仅返回已发布题库。参数校验、请求大小限制和题库 JSON 替换限制仍然生效。

- `POST /api/admin/dictionaries`：上传并创建题库 JSON；Swagger UI 支持直接提交 JSON，**需要登录**。
- `POST /api/admin/upload-dictionary`：通过 Swagger UI 选择 `.json` 文件上传；填写 `id`、`label`、`kind`，文件内容须为题库条目数组，**需要登录**。
- `PUT /api/admin/dictionaries/:id`：仅可提交 `label`、`category`、`status`；提交 `entries` 替换题库 JSON 暂时禁用并返回 403。题库 ID 和类型不能修改。
- `DELETE /api/admin/dictionaries/:id`：永久删除当前数据库登记的 COS 文件（含该对象的历史版本及删除标记），然后删除题库记录。不存在返回 404，共享文件引用冲突返回 409。保留文件的下架操作可通过 PUT 将 `status` 设为 `archived`。

题库 ID 和条目顺序影响旧版进度，上传前请检查内容。上传单次请求体上限仍为 5 MiB；DELETE 为不可恢复的永久删除；PUT 设置 `archived` 仅归档。

元数据更新示例：

```http
PUT /api/admin/dictionaries/cet4
Content-Type: application/json
Authorization: Bearer <登录返回的 token>

{"label":"四级词汇"}
```

根目录上传脚本中的文件上传和数据库写入不属于同一个事务；失败处理参见上传工具说明。并发修改同一题库时目前采用最后一次写入结果，管理端应避免并发操作。

读取接口面向小程序。上游有道服务可用性及使用授权需要自行确认。

## 本地验证

在 `service/` 目录运行 `npm ci`、`npm run build` 和 `npm test`。实际MySQL 数据库、云存储、云托管网关和有道发音需要部署后用真实环境验证。

服务监听成功后会打印实际监听 IP、端口以及非回环 IPv4 网卡地址。云托管日志中的容器 IP 用于排查，不等同于公网访问地址。

## 源码目录

- `service/src/index.ts`：启动服务、组装依赖和输出监听地址。
- `service/src/app.ts`：组合路由、健康检查和统一错误处理。
- `service/src/routes/`：发音、题库读取、管理员 HTTP 路由。
- `service/src/schemas/`：Zod 请求校验、OpenAPI schema 与题库上传数据准备。
- `service/src/types/`：数据结构和服务依赖契约。
- `service/src/middleware/`：全局后台会话鉴权及浏览器请求来源校验。
- `service/src/auth/`：密码哈希、随机令牌、账号类型与配置。
- `service/src/db/`：MySQL 连接池与环境配置。
- `service/src/repositories/`：题库 SQL 读写。
- `service/src/services/`：有道发音、云存储访问。
- `service/src/utils/`：公开字段与发布状态筛选。
- `service/src/tests/`：接口和数据库访问测试。
- `service/sql/`：数据库建表脚本。

## 本地 .env 文件

在 `service/` 中复制 `.env.example` 为 `.env` 后填写 MySQL 连接信息、云托管环境 ID、COS 桶名和地域。`ADMIN_SESSION_DAYS` 默认为 7（允许 1–30），`ADMIN_ALLOWED_ORIGINS` 配置浏览器后台及 Swagger 的完整来源，多个来源逗号分隔且不带尾斜杠。示例允许本机 localhost / 127.0.0.1 的 8080 和 5173 端口；通过局域网 IP 或生产域名访问时需要加入实际来源。临时 COS 凭据由云托管开放接口动态签发，不要在配置中保存固定 COS 密钥。`.env` 已排除 Git 提交及 Docker 构建上下文。

使用 Node.js 22（与镜像一致）执行 `npm --prefix cloud-service/service run dev`；编译后可执行 `npm --prefix cloud-service/service start`。这两个命令加载开发默认值、可选 `.env` 及 `.env.development.local`，系统已设置的环境变量优先；生产使用 `start:prod` 或 Docker，见文末环境配置。直接执行 `node dist/index.js` 不会加载 `.env`。

云托管容器继续由控制台注入环境变量，Docker 启动命令不依赖本地 `.env`。根目录上传脚本也不会自动读取该文件；若在本机上传，可从仓库根目录使用 `node --env-file=cloud-service/service/.env --import tsx scripts/upload-cloud-dictionary.ts` 加上相应参数。


## 后台账号注册与登录

后台账号与 Web、小程序本地学习进度相互独立，不提供学习账号同步。后台页面位于 `/admin/`，同时保留 API 和 Swagger。

### 初始化

新增 Drizzle 迁移 `0001_flaky_jack_power.sql` 只创建 `admin_users`、`admin_sessions`、`admin_invites` 和 `admin_auth_limits`，不修改现有题库表。先审查目标环境迁移记录，再在受控机器执行：

```sh
npm --prefix cloud-service/service run db:migrate
npm --prefix cloud-service/service run admin:init -- administrator
```

初始化命令交互输入两次密码，不回显、不接受密码命令行参数。用户名为 3–32 位英文、数字或下划线，统一小写；密码为 6–128 字符。命令只允许在没有超级管理员时创建首个 `super_admin`，重复执行拒绝覆盖。命令使用 `.env` 指向的数据库；服务启动不会自动迁移或创建账号。生产 Docker 镜像只包含服务运行文件，管理命令应在安装完整依赖的受控 checkout 中运行。

### 使用 Swagger

1. 打开 `/swagger`，调用 `POST /api/admin/auth/login`，提交 `{"username":"administrator","password":"你的密码"}`。
2. 同源浏览器自动使用 HttpOnly Cookie；也可复制响应 `token` 到 Swagger 的 **Authorize → AdminBearer**（只填令牌，不加 `Bearer `）。不要将令牌保存在源码或浏览器 localStorage。
3. 超级管理员调用 `POST /api/admin/invites`，请求体 `{}` 默认有效 24 小时；可传 `expiresInHours`，范围 1–168 小时。邀请码只返回一次。
4. 新管理员调用 `POST /api/admin/auth/register`，提交 `username`、`password`、`nickname` 和 `inviteCode`；注册后再调用登录。注册只能创建普通 `admin`，不可自选角色。
5. 登录后可上传题库、更新元数据、永久删除和上传图片。退出调用 `POST /api/admin/auth/logout`。

| 接口 | 作用 | 权限 |
| --- | --- | --- |
| `POST /api/admin/auth/register` | 消耗一次性邀请并注册 | 有效邀请码 |
| `POST /api/admin/auth/login` | 建立会话 | 用户名和密码 |
| `GET /api/admin/auth/me` | 查询当前账号 | 已登录 |
| `POST /api/admin/auth/logout` | 撤销当前会话 | 已登录 |
| `PUT /api/admin/auth/password` | `oldPassword` + `newPassword` 改密，撤销全部会话 | 已登录 |
| `POST /api/admin/invites` | 创建普通管理员邀请 | 超级管理员 |
| `DELETE /api/admin/invites/:id` | 撤销未使用邀请 | 超级管理员 |
| `GET /api/admin/users` | 管理员列表，不含密码哈希 | 超级管理员 |
| `PATCH /api/admin/users/:id/status` | `status: active / disabled` | 超级管理员 |

不能禁用自身或最后一个有效超级管理员。禁用时撤销全部会话，恢复账号不会恢复旧会话。未登录或会话失效返回 401，无角色权限或来源不允许返回 403，冲突返回 409，限流返回 429。邀请失效返回 400。

### 会话与部署边界

密码采用随机盐的异步 scrypt（N=32768、r=8、p=3）；数据库只存密码哈希、会话令牌哈希和邀请码哈希。会话固定期限，不滑动续期。生产 `NODE_ENV=production` 时 Cookie 启用 Secure，必须通过 HTTPS 访问；Cookie 为 HttpOnly、SameSite=Lax，路径 `/api/admin`。

浏览器写请求（含登录）必须携带 `ADMIN_ALLOWED_ORIGINS` 中的 Origin。Cookie 写操作缺少 Origin 也会被拒绝，以此防止 CSRF。无 Origin 的脚本使用 Bearer；登录和邀请注册允许无 Origin 的脚本调用。当前支持同源后台/Swagger，未开放跨域 CORS；白名单本身不会启用跨域前端访问。

登录、注册和改密采用 MySQL 共享限流：每 15 分钟每账号最多 10 次、每连接来源最多 100 次，成功操作同样计数。来源只读取 TCP 连接信息，不信任客户端可伪造的 X-Forwarded-For；经过云托管网关时，网关来源共用较保守的来源桶。多实例必须连接同一数据库。业务需要更高并发时，可配合可信网关策略调整，不能直接信任任意转发头。

忘记密码和定期清理通过受控命令处理：

```sh
npm --prefix cloud-service/service run admin:reset-password -- administrator
npm --prefix cloud-service/service run admin:cleanup
```

重置密码撤销该账号全部会话，不改变账号状态。清理删除过期会话和限流记录，不删除用户、邀请码或学习数据；可由受控运维任务定期执行。当前不提供短信、邮件验证、邮件找回或在线角色变更。

账号接口测试使用内存仓储，SQL 仓储测试模拟驱动；真实 MySQL 的迁移、事务并发及网关 Cookie/HTTPS 行为仍需在部署环境验收。

## 后台 Web 与目录结构

```text
cloud-service/
├── service/        # Hono 服务、MySQL/COS、迁移、服务端脚本与 .env
├── admin-web/      # React + Vite + Ant Design，独立 npm 依赖
├── Dockerfile      # 两端构建后同一个容器提供服务
└── README.md
```

原服务文件整体迁移到 `service/`，现有数据库结构无需因目录变更迁移；旧 checkout 的本地 `.env` 需移动到 `service/.env`。依赖分别安装，不是 npm workspace。要求 Node.js >=22.12（生产镜像 Node 22）。

从仓库根目录执行：

```sh
npm --prefix cloud-service/service ci
npm --prefix cloud-service/admin-web ci
# 两个终端分别启动
npm --prefix cloud-service/service run dev
npm --prefix cloud-service/admin-web run dev
```

开发页面为 `http://localhost:5173/admin/`，Vite 将 `/api` 代理至 `http://127.0.0.1:8080`，不会改写 Origin。请在 `service/.env` 的 `ADMIN_ALLOWED_ORIGINS` 加入实际使用的来源，例如 `http://localhost:5173`；已有 `.env` 不会被脚本自动更改。初始化超级管理员仍使用上文的 `admin:init`，后台不提供无邀请注册。

生产构建和本地验证：

```sh
npm --prefix cloud-service/admin-web run build
npm --prefix cloud-service/admin-web test
npm --prefix cloud-service/service run build
npm --prefix cloud-service/service test
npm --prefix cloud-service/service start
```

构建后服务同时提供 `/admin/` 和 `/api/admin/*`。生产 Docker 构建目录仍是 `cloud-service/`，不要改成 `service/`；Dockerfile 会分别构建两个目录并复制前端产物。服务器使用 HttpOnly、SameSite=Lax Cookie，生产 Cookie 带 Secure，需通过 HTTPS 访问。不要将登录返回的 token 存到 localStorage。后台页面可公开加载，但所有管理数据和操作均由服务端鉴权。

后台包含：登录、邀请注册、题库搜索/筛选/分页、JSON 上传预检和草稿创建、详情与分页内容预览、资料编辑、发布/永久删除/重新发布、修改密码、管理员禁用/恢复、邀请生成/查看/撤销。普通管理员可管理题库，只有超级管理员可管理账号及邀请。改密后需重新登录。邀请列表最多展示最近 100 条，不返回明文邀请码或哈希；明文只在生成时显示一次。

上传示例文件：[词汇 words.json](examples/words.json) 和 [短语 phrases.json](examples/phrases.json)，各含 5 条原创演示数据。在后台「新建题库」分别选择文件，页面会按完整文件内容识别类型（单词 / 短语），识别成功后自动切换；也可手动调整类型。题库 ID 可填写 `example-words` / `example-phrases`，名称和分类在表单中填写。文件顶层为条目数组，无需包裹 `entries` 或题库元数据；词汇需要 `name`、非空 `trans` 数组，短语需要唯一 `id`、`zh`、`english` 和按英文顺序拆分的 `words` 数组。

示例也包含可选音标：词汇的 `ukphone` / `usphone` 分别为英音 / 美音，值不带斜杠；短语的 `annotations` 与 `words` 按位置一一对应，`phonetic` 带斜杠，示例采用英音，并提供逐词释义、词性和颜色。

题库列表和详情均提供永久删除入口，草稿、已发布、已归档题库都可删除。成功后从后台列表移除，详情页返回列表；不能重新发布已删除记录。用户设备已下载的缓存和学习进度不会被远程清除。

删除使用数据库行锁保护当前文件引用；文件被其他题库引用时拒绝删除。只精确枚举当前登记对象的版本，不清理其他路径、旧内容哈希路径的遗留文件或上传失败的孤立文件。COS 临时凭据需具备 `cos:GetBucketObjectVersions` 和 `cos:DeleteObject` 权限。参见 [COS 对象版本 API](https://cloud.tencent.com/document/product/436/35521) 和 [删除对象 API](https://cloud.tencent.cn/document/api/436/7743)。

COS 与 MySQL 不属于同一个事务：文件删除失败时保留数据库记录，部分版本可能已删除；文件删除成功但数据库删除或提交失败时文件无法回滚，请刷新后台，记录仍存在则再次删除。文件已不存在时可重试完成记录清理；不要将失败记录重新发布。单个对象超过 10000 个版本时拒绝自动删除，改用受控存储工具处理。部署应同步更新前后端，避免旧前端仍显示归档确认文案。

后台上传默认保存草稿，再由管理员在详情页发布。请求总大小（含 multipart）上限 5 MiB；前端为元数据预留空间。上传不改写条目顺序、不替换已有题库内容。上传存储与数据库仍非同一个事务，失败时检查服务端日志，不自动删除云文件。学习进度仍在设备本地，不提供跨端用户运营统计。

新增只读接口（均需会话）：

- `GET /api/admin/dictionaries?page=1&pageSize=20&q=&kind=&status=&category=`：全状态题库分页，返回 `dictionaries`、`total`、`page`、`pageSize`；可选参数无值时省略。
- `GET /api/admin/dictionaries/:id`：含发布状态和时间的管理资料，不返回云存储路径。
- `GET /api/admin/dictionaries/:id/content?offset=0&limit=20&version=<sha256>`：草稿、发布和归档内容预览，`next=null` 表示结束；版本不符返回 409。
- `GET /api/admin/invites`：超级管理员查看最近邀请。

验收需覆盖：Cookie 登录刷新、过期跳转、普通管理员访问限制、草稿上传后不出现在公开目录、发布后可见、永久删除文件及记录、删除失败可重试、共享引用拒绝删除、题目预览顺序、错误 JSON 和重复 ID 提示、改密退出、邀请一次性消费，以及 HTTPS 网关下的真实 MySQL/COS 连通性。本地测试使用模拟依赖，不会写入真实云数据。

后台前端按职责拆分：`admin-web/src/pages/` 每个路由页独立文件，`layouts/` 放后台导航布局，`auth/` 放会话和角色守卫，`routes.tsx` 集中声明路由，`App.tsx` 只组合入口。登录和注册共用 `components/AuthForm.tsx`，接口传输统一通过 `api.ts`，由 TanStack React Query 管理请求状态：`useResource` 负责查询缓存及取消，`useApiMutation` 负责写操作及相关列表、详情的缓存失效。查询缓存保鲜 30 秒，失败不自动重试，窗口重新聚焦不自动刷新；写操作不自动重试。会话退出、过期及登录切换会清除业务缓存，缓存只存在内存中，登录返回的 Bearer token 不进入缓存。

## 开发与生产环境变量

前端默认文件：`admin-web/.env.development`、`.env.production`。`npm run dev` 使用 development，`npm run build` 使用 production。开发配置可复制 `.env.local.example` 为 `.env.development.local` 覆盖：

- `ADMIN_DEV_HOST`：开发服务器监听地址，默认 127.0.0.1。
- `ADMIN_DEV_PORT`：开发端口，默认 5173。
- `ADMIN_API_PROXY`：开发 API 代理目标，默认 http://127.0.0.1:8080。

这些变量只供 Vite 配置使用，不通过 `VITE_` 注入浏览器。线上维持 `/admin/` 与 `/api/admin` 同源，不需要设置前端 API 域名。更换开发页面端口或访问域名时，需同步更新服务端 `ADMIN_ALLOWED_ORIGINS`。

若开发请求返回 `403 请求来源不允许`，在 `service/.env.development.local` 设置 `ADMIN_ALLOWED_ORIGINS` 为浏览器地址栏的实际来源（协议、主机、端口，不含 `/admin/`），然后重启 service。例如本机开发使用 `http://localhost:5173,http://127.0.0.1:5173`；局域网访问再追加 `http://你的局域网IP:5173`。该变量覆盖整个列表，需保留仍在使用的其他来源。`ADMIN_DEV_HOST=0.0.0.0` 是监听所有网卡，不应将 `0.0.0.0` 填入白名单；`ADMIN_API_PROXY` 是后端目标，也不能替代浏览器来源。Vite 代理保留 Origin，不能靠改写或删除它绕过校验。

服务端 `dev`、`start` 及本机管理命令依次加载 `.env.development` → 可选旧 `.env` → 可选 `.env.development.local`；后加载文件覆盖前者，进程环境变量优先级最高。旧 `.env` 可继续使用，也可参照 `.env.development.local.example` 配置独立开发连接。

非容器生产运行使用 `npm --prefix cloud-service/service run start:prod`，仅加载 `.env.production` 和可选 `.env.production.local`，不会读取开发 `.env`。生产配置参照 `.env.production.local.example`，填写实际数据库、COS 和 HTTPS 后台来源。不要在生产配置中覆盖 `NODE_ENV=production`，它控制 Secure Cookie。

云托管 Docker 启动仍直接执行 `node dist/index.js`，由平台注入环境变量；镜像已设置 `NODE_ENV=production` 和 `PORT=8080`。镜像不包含任何 `.env` 文件，数据库与 COS 凭据不作为构建参数。以上环境文件切换不自动执行数据库迁移或创建管理员。

### 管理后台品牌样式

后台侧栏使用 `admin-web/public/sentleap-app-icon.png`，使用 Web 同款透明品牌小图标，显示尺寸为 56 × 56px，搭配品牌名称与后台说明横向排列。主题以品牌蓝 `#007aff`、深蓝 `#001b33` 为主，青绿与黄色为辅助色；Ant Design 主题位于 `admin-web/src/main.tsx`，页面样式位于 `admin-web/src/style.css`。

登录与邀请注册页面采用居中表单布局，不展示品牌宣传区域。
