# SentLeap 云托管服务

Hono + TypeScript 服务提供发音、云端题库目录和 JSON 内容接口。上传继续使用仓库根目录的 `npm run upload:dictionary`：脚本把 JSON 上传至云存储，并将返回的 `fileID` 和元数据写入 `dictionaries` 集合。未设置 `status` 的历史记录视为可见；设置为 `published` 可发布，其他状态不会通过接口返回。也可通过管理员接口上传、更新及下架题库。

## 部署

1. 在小程序关联的云开发环境开通微信云托管，并创建文档型数据库集合 `dictionaries`。
2. 在云托管控制台将仓库的 `cloud-service` 目录作为构建目录，用其中的 Dockerfile 创建服务；服务名需与小程序配置一致，当前为 `sentleap-service`。将云托管服务配置中的容器端口设置为 `8080`，并确保 `PORT` 环境变量与容器端口一致。服务监听 `PORT`，未设置时默认使用 8080；健康检查路径为 `/health`。镜像以普通用户运行，请勿将端口设置为 80。
3. 云托管服务需要该环境云数据库读写及云存储读取、上传权限。SDK 使用运行环境提供的凭据；如实际环境未注入凭据，按控制台和 SDK 文档通过服务端环境变量配置具有最小权限的凭据。环境 ID 不同时，服务端设置 `CLOUDBASE_ENV_ID`。不要把密钥放入源码、镜像或小程序。
4. 在 `miniprogram/config.ts` 填写关联环境 ID 和实际服务名，部署成功后在开发者工具及真机检查发音和题库。如果只有小程序调用，建议关闭云托管公网访问。
5. 使用小程序 README 中的上传命令登记题库，在小程序“全部题库”刷新查看。直接在控制台上传 JSON 不会自动登记数据库。

上传脚本保留既有数据的条目顺序和题库 ID；修改题库时应注意旧进度按 ID 与顺序对应。文件上传和数据库写入不是一个事务，失败处理参见上传工具说明。

## 接口

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

在本目录运行 `npm ci`、`npm run build` 和 `npm test`。实际云数据库、云存储、云托管网关和有道发音需要部署后用真实环境验证。
