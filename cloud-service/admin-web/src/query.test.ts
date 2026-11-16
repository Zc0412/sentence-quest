/** 缓存回归：写操作覆盖所有分页，会话切换后迟到响应不得恢复旧数据。 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAdminCache,
  createQueryClient,
  invalidateResource,
  resourceKey,
  sessionKey,
} from "./query";

test("题库变更失效全部分页和详情，保留其他资源", async () => {
  const client = createQueryClient();
  const paths = [
    "/dictionaries?page=1",
    "/dictionaries?page=2&status=draft",
    "/dictionaries/book",
    "/dictionaries/book/content?offset=20",
    "/users",
    "/dictionaries-other",
  ];
  for (const path of paths) client.setQueryData(resourceKey(path), {});
  await invalidateResource(client, "/dictionaries");
  for (const path of paths) {
    assert.equal(
      client.getQueryState(resourceKey(path))?.isInvalidated,
      paths.indexOf(path) < 4,
    );
  }
  client.clear();
});

test("退出清除业务缓存并取消旧请求，迟到响应不会覆盖新会话", async () => {
  const client = createQueryClient();
  let resolve!: (value: string) => void;
  let signal!: AbortSignal;
  client.setQueryData(sessionKey, { id: "old" });
  client.setQueryData(resourceKey("/users"), ["old"]);
  const pending = client
    .fetchQuery({
      queryKey: resourceKey("/invites"),
      queryFn: (context) => {
        signal = context.signal;
        return new Promise<string>((done) => {
          resolve = done;
        });
      },
    })
    .catch(() => undefined);
  clearAdminCache(client);
  client.setQueryData(sessionKey, { id: "new" });
  assert.equal(signal.aborted, true);
  resolve("old private data");
  await pending;
  assert.equal(client.getQueryData(resourceKey("/invites")), undefined);
  assert.equal(client.getQueryData(resourceKey("/users")), undefined);
  assert.deepEqual(client.getQueryData(sessionKey), { id: "new" });
  client.clear();
});
