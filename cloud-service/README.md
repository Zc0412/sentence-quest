# SentLeap 云托管服务

Hono + TypeScript 服务提供发音、云端题库目录和 JSON 内容接口。Swagger UI 可粘贴 JSON 请求体或选择 JSON 文件创建题库；替换已有题库 JSON 仍需使用仓库根目录的 `npm run upload:dictionary`。未设置 `status` 的历史记录视为可见；设置为 `published` 可发布，其他状态不会通过接口返回。

## 部署

1. 在微信云托管开通 MySQL 服务，并为本地命令配置数据库服务器可达的 MySQL 环境变量。首次初始化时可在 `cloud-service/` 运行 `npm run db:setup`：该命令先创建 `.env` 指定的数据库（若不存在），再应用 Drizzle 迁移。初始化账号必须有 `CREATE DATABASE` 权限；服务运行账号不需要此权限。已有数据库仅需运行 `npm run db:migrate`。后续修改 schema 后运行 `npm run db:generate` 生成迁移，检查生成的 SQL 后提交，再在目标环境运行 `npm run db:migrate`。不要对已有题库数据的数据库直接运行尚未核对的迁移。
2. 在云托管控制台将仓库的 `cloud-service` 目录作为构建目录，用其中的 Dockerfile 创建服务；服务名需与小程序配置一致，当前为 `sentleap-service`。将云托管服务配置中的容器端口设置为 `8080`，并确保 `PORT` 环境变量与容器端口一致。服务监听 `PORT`，未设置时默认使用 8080；健康检查路径为 `/health`。镜像以普通用户运行，请勿将端口设置为 80。
3. 在云托管控制台开启「开放接口服务」的对象存储能力，为服务配置 `/_/cos/getauth` 与 `/_/cos/metaid/encode` 接口并创建新服务版本；服务需要 MySQL 读写权限。配置 `WX_CLOUD_ENV_ID`、`COS_BUCKET`、`COS_REGION`（云托管控制台「对象存储-存储配置」可查）。服务通过开放接口获取短期 COS 凭据和小程序访问所需的文件元数据，再使用 COS SDK 上传、下载。请将对象存储读权限配置为小程序用户可访问，避免文件权限阻止题库读取。
4. 在 `miniprogram/config.ts` 填写关联环境 ID 和实际服务名，部署成功后在开发者工具及真机检查发音和题库。如果只有小程序调用，建议关闭云托管公网访问。
5. 根目录上传脚本与 Swagger 上传都写入云托管对象存储和 MySQL；在本机运行脚本时需在 `cloud-service/.env` 配置同一云托管环境、存储桶、地域及数据库连接。直接在控制台上传 JSON 不会自动登记数据库。

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

服务启动不会自动建库或迁移。生产环境建议通过受控的 `db:setup` 初始化流程或数据库管理工具建库、迁移，再给云托管运行账号授予该表的 SELECT/INSERT/UPDATE 权限；不建议给服务运行账号长期授予 `CREATE DATABASE`。也可手动执行 `sql/001-dictionaries.sql` 创建初始表；该方式与 Drizzle 首次迁移二选一，不要在同一数据库对未登记的初始迁移重复执行。健康接口只表示进程可响应，不代表数据库已连接；用题库列表接口验证实际读库。

旧云开发存储中的 JSON 文件不会自动迁移。请使用原 JSON 及相同题库 ID 重新上传至云托管对象存储并登记到 MySQL；旧的发布状态等管理字段需要单独核对。不要在切换前删除旧记录或云文件。

本机上传脚本使用云托管开放接口获取短期 COS 凭据，不需要固定云存储密钥；需安装根目录与 `cloud-service/` 的依赖，并配置上述云托管环境、COS 桶及 MySQL。若电脑无法连接数据库内网，应在能访问 MySQL 的受控环境运行脚本；不要为此直接开放数据库公网访问。

## 接口

- `GET /swagger`：Swagger UI 交互式 API 文档；`GET /openapi.json`：由路由 Zod schema 生成的 OpenAPI 3.0 描述。请求参数与管理员 JSON 请求体使用 Zod 校验，修改接口字段时请同步更新 schema。
- `GET /health`：健康检查。
- `POST /api/pronunciation`：JSON 参数 `{ "word": "hello", "type": "1" }`；`1` 为英音、`2` 为美音。响应包含 Base64 音频。
- `GET /api/dictionaries`：获取题库公开目录，返回 `{ dictionaries: [...] }`。
- `GET /api/dictionaries/:id`：获取已发布题库的公开资料。
- `GET /api/dictionaries/:id/content`：根据数据库登记的文件 ID 分页获取题目，参数 `offset` 和 `version` 分别为条目偏移量和目录中的 SHA-256；返回 `items`、下一页偏移量 `next`（最后一页为 `null`）和 `sha256`。不会接受客户端提供的云存储路径。

### 管理题库

元数据管理接口需要在云托管服务端环境变量设置 `DICTIONARY_ADMIN_TOKEN`（至少 32 个字符，使用高强度随机值），由可信的管理端通过 `Authorization: Bearer <令牌>` 提供。未配置令牌或令牌错误时，更新和下架接口返回 401。令牌不要放入小程序、仓库或客户端代码；需要在服务端管理环境中保管。

- `POST /api/admin/dictionaries`：上传并创建题库 JSON；Swagger UI 支持直接提交 JSON，**暂不鉴权**。
- `POST /api/admin/upload-dictionary`：通过 Swagger UI 选择 `.json` 文件上传；填写 `id`、`label`、`kind`，文件内容须为题库条目数组，**暂不鉴权**。
- `PUT /api/admin/dictionaries/:id`：仅可提交 `label`、`category`、`status`；提交 `entries` 替换题库 JSON 暂时禁用并返回 403。题库 ID 和类型不能修改。
- `DELETE /api/admin/dictionaries/:id`：将状态改为 `archived`，保留数据库记录和云文件；可用 PUT 将 `status` 设为 `published` 重新发布。

**安全提醒：** 上传接口没有令牌或其他访问控制，若服务可从公网访问，任何人都可能创建题库并消耗云存储/数据库资源。暂时只应在可信网络或关闭公网访问的环境使用；单次请求体上限为 5 MiB。题库 ID 和条目顺序影响旧版进度，上传前请检查内容。

元数据更新示例（管理令牌应由可信管理端安全提供）：

```http
PUT /api/admin/dictionaries/cet4
Authorization: Bearer <管理员令牌>
Content-Type: application/json

{"label":"四级词汇"}
```

根目录上传脚本中的文件上传和数据库写入不属于同一个事务；失败处理参见上传工具说明。并发修改同一题库时目前采用最后一次写入结果，管理端应避免并发操作。

读取接口面向小程序。上游有道服务可用性及使用授权需要自行确认。

## 本地验证

在本目录运行 `npm ci`、`npm run build` 和 `npm test`。实际MySQL 数据库、云存储、云托管网关和有道发音需要部署后用真实环境验证。

服务监听成功后会打印实际监听 IP、端口以及非回环 IPv4 网卡地址。云托管日志中的容器 IP 用于排查，不等同于公网访问地址。

## 源码目录

- `src/index.ts`：启动服务、组装依赖和输出监听地址。
- `src/app.ts`：组合路由、健康检查和统一错误处理。
- `src/routes/`：发音、题库读取、管理员 HTTP 路由。
- `src/schemas/`：Zod 请求校验、OpenAPI schema 与题库上传数据准备。
- `src/types/`：数据结构和服务依赖契约。
- `src/middleware/`：管理员鉴权。
- `src/db/`：MySQL 连接池与环境配置。
- `src/repositories/`：题库 SQL 读写。
- `src/services/`：有道发音、云存储访问。
- `src/utils/`：公开字段与发布状态筛选。
- `src/tests/`：接口和数据库访问测试。
- `sql/`：数据库建表脚本。

## 本地 .env 文件

复制 `.env.example` 为 `.env` 后填写 MySQL 连接信息、云托管环境 ID、COS 桶名和地域，以及元数据管理令牌。临时 COS 凭据由云托管开放接口动态签发，不要在配置中保存固定 COS 密钥。`.env` 已排除 Git 提交及 Docker 构建上下文。

使用 Node.js 22（与镜像一致）执行 `npm --prefix cloud-service run dev`；编译后可执行 `npm --prefix cloud-service start`。这两个命令通过 Node 的 `--env-file=.env` 加载配置，系统已设置的环境变量优先。直接执行 `node dist/index.js` 不会加载 `.env`。

云托管容器继续由控制台注入环境变量，Docker 启动命令不依赖本地 `.env`。根目录上传脚本也不会自动读取该文件；若在本机上传，可从仓库根目录使用 `node --env-file=cloud-service/.env --import tsx scripts/upload-cloud-dictionary.ts` 加上相应参数。
