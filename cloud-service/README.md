# SentLeap 云托管服务

Hono + TypeScript 服务提供发音、云端题库目录和 JSON 内容接口。上传继续使用仓库根目录的 `npm run upload:dictionary`：脚本把 JSON 上传至云存储，并将返回的 `fileID` 和元数据写入 `dictionaries` 表。未设置 `status` 的历史记录视为可见；设置为 `published` 可发布，其他状态不会通过接口返回。也可通过管理员接口上传、更新及下架题库。

## 部署

1. 在微信云托管开通 MySQL 数据库，并为本地命令配置可访问该库的 MySQL 环境变量。在空数据库中，从 `cloud-service/` 运行 `npm run db:migrate`，按 Drizzle schema 应用已提交的迁移并创建题库表。后续修改 schema 后运行 `npm run db:generate` 生成迁移，检查生成的 SQL 后提交，再在目标环境运行 `npm run db:migrate`。`db:migrate` 会连接真实数据库；不要对已有题库数据的数据库直接运行尚未核对的迁移。
2. 在云托管控制台将仓库的 `cloud-service` 目录作为构建目录，用其中的 Dockerfile 创建服务；服务名需与小程序配置一致，当前为 `sentleap-service`。将云托管服务配置中的容器端口设置为 `8080`，并确保 `PORT` 环境变量与容器端口一致。服务监听 `PORT`，未设置时默认使用 8080；健康检查路径为 `/health`。镜像以普通用户运行，请勿将端口设置为 80。
3. 云托管服务需要 MySQL 数据库读写及云存储读取、上传权限。MySQL 连接必须配置下文的数据库环境变量；云存储 SDK 使用运行环境提供的凭据，如实际环境未注入存储凭据，再按 SDK 文档配置服务端凭据。云存储环境不同时，设置 `CLOUDBASE_ENV_ID`，它不控制 MySQL 连接。不要把密钥放入源码、镜像或小程序。
4. 在 `miniprogram/config.ts` 填写关联环境 ID 和实际服务名，部署成功后在开发者工具及真机检查发音和题库。如果只有小程序调用，建议关闭云托管公网访问。
5. 使用小程序 README 中的上传命令登记题库，在小程序“全部题库”刷新查看。直接在控制台上传 JSON 不会自动登记数据库。

上传脚本保留既有数据的条目顺序和题库 ID；修改题库时应注意旧进度按 ID 与顺序对应。文件上传和数据库写入不是一个事务，失败处理参见上传工具说明。

## MySQL 配置

题库资料使用 `mysql2/promise` 连接池保存到云托管 MySQL；`@cloudbase/node-sdk` 仅用于云存储文件操作，不再访问云开发文档数据库。连接池使用预处理语句绑定参数。参见 [mysql2 连接池说明](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool)。

在云托管服务端设置以下环境变量（不要填写到小程序或提交真实密码）：

| 变量 | 说明 |
| --- | --- |
| `MYSQL_HOST` | 数据库内网主机地址；也可使用 `MYSQL_ADDRESS=主机:端口` |
| `MYSQL_PORT` | 默认 3306，优先于 `MYSQL_ADDRESS` 内的端口 |
| `MYSQL_USERNAME` | 数据库账号，也兼容 `MYSQL_USER` |
| `MYSQL_PASSWORD` | 数据库密码 |
| `MYSQL_DATABASE` | 已创建的数据库名 |
| `MYSQL_SSL_CA` | 可选，启用 TLS 时使用的可信 CA PEM 内容，不关闭证书验证 |

服务启动不会自动建库或迁移。也可在目标数据库手动执行 `sql/001-dictionaries.sql` 创建初始表；该方式与 Drizzle 首次迁移二选一，不要在同一数据库对未登记的初始迁移重复执行。确保云托管服务与 MySQL 网络可达、账号有该表的 SELECT/INSERT/UPDATE 权限。健康接口只表示进程可响应，不代表数据库已连接；用题库列表接口验证实际读库。

旧云开发集合不会自动迁移。可用原 JSON 及相同题库 ID 重新运行上传脚本，将文件信息登记到 MySQL；旧的发布状态等管理字段需要单独核对。不要在切换前删除旧记录或云文件。

本机上传脚本同样需要上述 MySQL 配置及云存储凭据，并需要安装根目录与 `cloud-service/` 的依赖。若电脑无法连接数据库内网，可在能访问 MySQL 的受控环境运行脚本，或调用管理接口上传；不要为此直接开放数据库公网访问。

## 接口

- `GET /swagger`：Swagger UI 交互式 API 文档；`GET /openapi.json`：OpenAPI 3.0 JSON 描述。
- `GET /health`：健康检查。
- `POST /api/pronunciation`：JSON 参数 `{ "word": "hello", "type": "1" }`；`1` 为英音、`2` 为美音。响应包含 Base64 音频。
- `GET /api/dictionaries`：获取题库公开目录，返回 `{ dictionaries: [...] }`。
- `GET /api/dictionaries/:id`：获取已发布题库的公开资料。
- `GET /api/dictionaries/:id/content`：根据数据库登记的文件 ID 分页获取题目，参数 `offset` 和 `version` 分别为条目偏移量和目录中的 SHA-256；返回 `items`、下一页偏移量 `next`（最后一页为 `null`）和 `sha256`。不会接受客户端提供的云存储路径。

### 管理题库

管理接口需要在云托管服务端环境变量设置 `DICTIONARY_ADMIN_TOKEN`（至少 32 个字符，使用高强度随机值），由可信的管理端通过 `Authorization: Bearer <令牌>` 提供。未配置令牌或令牌错误时所有管理接口均返回 401。令牌不要放入小程序、仓库或客户端代码；需要在服务端管理环境中保管。不要为了调用接口而把令牌发给普通用户。若开启公网访问，管理端必须通过 HTTPS 连接，并做好令牌轮换与访问控制。

- `POST /api/admin/dictionaries`：JSON 请求体包含 `id`、`label`、`kind`（`word` 或 `phrase`）、`entries`（非空数组），可选 `category`、`status`。返回 201，ID 已存在返回 409。
- `PUT /api/admin/dictionaries/:id`：可提交 `label`、`category`、`status` 和 `entries` 的任意组合；提供 `entries` 时上传新 JSON，保留原文件。题库 ID 和类型不能修改。
- `DELETE /api/admin/dictionaries/:id`：将状态改为 `archived`，保留数据库记录和云文件；可用 PUT 将 `status` 设为 `published` 重新发布。

状态支持 `published`、`draft`、`archived`，新题库默认发布。单词条目需要 `name` 和非空字符串数组 `trans`；短语条目需要唯一 `id`、`zh`、`english` 和非空字符串数组 `words`，与现有上传脚本格式一致。单次 JSON 请求上限为 5 MiB；调用渠道可能有更小的请求限制，大题库可使用本机上传脚本。题库 ID 和条目顺序影响旧版进度，修改前应评估兼容性。

请求示例（`$TOKEN` 应由可信管理端安全提供）：

```http
POST /api/admin/dictionaries
Authorization: Bearer <管理员令牌>
Content-Type: application/json

{"id":"sample","label":"测试词库","kind":"word","entries":[{"name":"cat","trans":["n. 猫"]}]}
```

文件上传和数据库写入不属于同一个事务。若数据库写入失败，服务日志会记录已上传的 fileID 供管理员排查；服务不会自动删除文件，以免影响复用相同内容的记录。并发修改同一题库时目前采用最后一次写入结果，管理端应避免并发操作。

读取接口面向小程序。上游有道服务可用性及使用授权需要自行确认。

## 本地验证

在本目录运行 `npm ci`、`npm run build` 和 `npm test`。实际MySQL 数据库、云存储、云托管网关和有道发音需要部署后用真实环境验证。

服务监听成功后会打印实际监听 IP、端口以及非回环 IPv4 网卡地址。云托管日志中的容器 IP 用于排查，不等同于公网访问地址。

## 源码目录

- `src/index.ts`：启动服务、组装依赖和输出监听地址。
- `src/app.ts`：组合路由、健康检查和统一错误处理。
- `src/openapi.ts`：Swagger UI 使用的 OpenAPI 接口描述。
- `src/routes/`：发音、题库读取、管理员 HTTP 路由。
- `src/schemas/`：题库输入校验及上传数据准备。
- `src/types/`：数据结构和服务依赖契约。
- `src/middleware/`：管理员鉴权。
- `src/db/`：MySQL 连接池与环境配置。
- `src/repositories/`：题库 SQL 读写。
- `src/services/`：有道发音、云存储访问。
- `src/utils/`：公开字段与发布状态筛选。
- `src/tests/`：接口和数据库访问测试。
- `sql/`：数据库建表脚本。

## 本地 .env 文件

复制 `.env.example` 为 `.env` 后填写 MySQL 连接信息、云存储凭据和管理员令牌。`.env` 已排除 Git 提交及 Docker 构建上下文，示例文件不包含真实密钥。

使用 Node.js 22（与镜像一致）执行 `npm --prefix cloud-service run dev`；编译后可执行 `npm --prefix cloud-service start`。这两个命令通过 Node 的 `--env-file=.env` 加载配置，系统已设置的环境变量优先。直接执行 `node dist/index.js` 不会加载 `.env`。

云托管容器继续由控制台注入环境变量，Docker 启动命令不依赖本地 `.env`。根目录上传脚本也不会自动读取该文件；若在本机上传，可从仓库根目录使用 `node --env-file=cloud-service/.env --import tsx scripts/upload-cloud-dictionary.ts` 加上相应参数。
