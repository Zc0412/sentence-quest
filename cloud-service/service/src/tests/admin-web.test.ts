/** 后台查询与静态托管回归：内存仓储，不访问真实 MySQL 或 COS。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Hono } from "hono";
import { mountAdminWeb } from "../admin-web";
import { createApp } from "../app";
import { authFixture, testHeaders } from "./auth-fixture";
import { hashToken } from "../auth/crypto";
import type { Dictionary } from "../types/services";

function fixture() {
  const auth = authFixture();
  const dictionaries: Dictionary[] = ["published", "draft", "archived"].map(
    (status) => ({
      id: status,
      label: status,
      kind: "word",
      category: "词汇",
      status,
      wordCount: 3,
      sha256: "a".repeat(64),
      fileID: `cloud://test/${status}`,
    }),
  );
  const app = createApp({
    auth: auth.repo,
    async list() {
      return dictionaries;
    },
    async get(id) {
      return dictionaries.find((row) => row.id === id);
    },
    async listAdmin(query) {
      assert.equal(query.pageSize, 2);
      const rows = dictionaries.filter(
        (row) => !query.status || row.status === query.status,
      );
      return {
        dictionaries: rows.slice(
          (query.page - 1) * query.pageSize,
          query.page * query.pageSize,
        ),
        total: rows.length,
      };
    },
    async download(id) {
      assert.ok(dictionaries.some((row) => row.fileID === id));
      return Buffer.from(
        JSON.stringify(
          ["cat", "dog", "sun"].map((name) => ({ name, trans: ["释义"] })),
        ),
      );
    },
    async pronounce() {
      return { ok: false };
    },
  });
  return { app, auth };
}

test("后台查询需登录，允许预览草稿和归档；公开读取仍隐藏这些内容", async () => {
  const { app } = fixture();
  for (const path of [
    "/api/admin/dictionaries",
    "/api/admin/dictionaries/draft",
    "/api/admin/dictionaries/archived/content?version=" + "a".repeat(64),
  ]) {
    assert.equal((await app.request(path)).status, 401);
  }
  const list = (await (
    await app.request("/api/admin/dictionaries?pageSize=2&status=archived", {
      headers: testHeaders,
    })
  ).json()) as any;
  assert.equal(list.total, 1);
  assert.equal(list.dictionaries[0].status, "archived");
  assert.equal(list.dictionaries[0].fileID, undefined);
  for (const status of ["draft", "archived"]) {
    assert.equal(
      (await app.request(`/api/dictionaries/${status}`)).status,
      404,
    );
    const detail = await app.request(`/api/admin/dictionaries/${status}`, {
      headers: testHeaders,
    });
    assert.equal(detail.status, 200);
    const result = await app.request(
      `/api/admin/dictionaries/${status}/content?version=${"a".repeat(64)}&limit=2`,
      { headers: testHeaders },
    );
    const body = (await result.json()) as any;
    assert.equal(result.status, 200);
    assert.equal(body.next, 2);
    assert.equal(body.total, 3);
    assert.deepEqual(
      body.items.map((item: any) => item.name),
      ["cat", "dog"],
    );
    const last = (await (
      await app.request(
        `/api/admin/dictionaries/${status}/content?version=${"a".repeat(64)}&offset=2`,
        { headers: testHeaders },
      )
    ).json()) as any;
    assert.equal(last.next, null);
    assert.equal(last.items[0].name, "sun");
  }
  assert.equal(
    (
      await app.request("/api/admin/dictionaries?pageSize=101", {
        headers: testHeaders,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await app.request(
        "/api/admin/dictionaries/draft/content?version=" + "b".repeat(64),
        { headers: testHeaders },
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await app.request(
        "/api/admin/dictionaries/draft/content?version=" +
          "a".repeat(64) +
          "&offset=99",
        { headers: testHeaders },
      )
    ).status,
    400,
  );
});

test("邀请列表仅超级管理员可见，响应排除邀请码及哈希", async () => {
  const { app, auth } = fixture();
  const created = (await (
    await app.request("/api/admin/invites", {
      method: "POST",
      headers: { ...testHeaders, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json()) as any;
  const list = await app.request("/api/admin/invites", {
    headers: testHeaders,
  });
  assert.equal(list.status, 200);
  const body = await list.text();
  assert.ok(body.includes(created.id));
  assert.ok(!body.includes(created.inviteCode));
  assert.ok(!body.includes(hashToken(created.inviteCode)));
  assert.ok(!body.includes("codeHash"));
  auth.root.role = "admin";
  assert.equal(
    (await app.request("/api/admin/invites", { headers: testHeaders })).status,
    403,
  );
  assert.equal(
    (
      await app.request("/api/admin/dictionaries/draft", {
        headers: testHeaders,
      })
    ).status,
    200,
  );
});

test("后台刷新返回 SPA，资源缺失和 API 不回退；未构建返回明确提示", async () => {
  const root = mkdtempSync(join(tmpdir(), "sentleap-admin-"));
  try {
    const app = new Hono();
    mountAdminWeb(app, root);
    assert.equal((await app.request("/admin/")).status, 503);
    mkdirSync(join(root, "assets"));
    writeFileSync(join(root, "index.html"), "<html>admin entry</html>");
    writeFileSync(join(root, "assets", "test.js"), "export const value = 1;");
    assert.equal((await app.request("/admin")).status, 302);
    assert.match(
      await (await app.request("/admin/dictionaries/cet4.v2")).text(),
      /admin entry/,
    );
    assert.match(
      await (await app.request("/admin/assets/test.js")).text(),
      /value = 1/,
    );
    assert.equal((await app.request("/admin/assets/missing.js")).status, 404);
    assert.equal((await app.request("/api/admin/missing")).status, 404);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
