# 数据库与多端同步演进规划

## 当前模式：离线优先

`Game Hook → storage service → ProgressRepository → IndexedDB`

所有输入在客户端实时判断，只保存汇总结果。匿名玩家的进度记录以 `profileId = "guest"` 保存；题库 ID 稳定，后续可以与云端关联。

## 下一阶段：登录 + PostgreSQL / Supabase

建议最初将**账号和权限检查置于服务端**，客户端向 Next.js Route Handler 发请求，由服务器读取 JWT/会话并执行数据库操作。避免直接让浏览器使用数据库管理密钥。建议数据表：

- `sentences(id text primary key, zh text, english text, level int, ...)`
- `user_sentence_progress(user_id uuid, sentence_id text, completed_at timestamptz, ...)`，约束 `unique(user_id, sentence_id)`
- `learning_events(id uuid primary key, user_id uuid, client_id text, sentence_id text, kind text, created_at timestamptz, payload jsonb)`

第一版仅云端化进度快照也可以，但多设备的计数类数据容易冲突，建议在实现真正的离线同步之前引入**不可变练习事件**：每个事件包含稳定的 ID 和客户端唯一 ID，用服务端 `id` 去重以支持重复重试。完成次数、XP、错误数由服务器根据去重记录聚合，而不是将客户端总计数直接相加。

## 同步接口建议

- `GET /api/me/progress`：只读取当前登录用户的数据。
- `POST /api/me/learning-events`：幂等批量提交离线事件，返回已接受事件 ID。
- `GET /api/me/learning-events?cursor=...`：拉取服务器已经确认的其他设备变更。

未来在 IndexedDB 新增 `pendingEvents` object store，先本地记录、再上传；服务端 ACK 后删除待同步事件。每次更新数据结构时递增 `DATABASE_VERSION` 并写 `onupgradeneeded` 迁移，**不要直接删除 IndexedDB 重新建库**。

## 与本地存档的关系

IndexedDB 可以继续作为离线缓存；服务器数据库作为登录用户的跨设备权威源。匿名进度与已有账号记录不可简单覆盖：登录后提示是否合并旧进度，并采用事件去重或经过明确设计的合并策略。

当前仓储已有 `ProgressRepository` 接口和 `revision`/`updatedAt` 元数据，但**尚无实际云端同步、账号合并与冲突解决代码**。
