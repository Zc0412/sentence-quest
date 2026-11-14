/** 后台题库查询：包含草稿和归档记录，仍只读取数据库登记的云文件。 */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authSecurity } from "../middleware/admin-auth";
import {
  DictionaryIdSchema,
  DictionarySchema,
  JsonErrorResponse,
  zodValidationErrorHandler,
} from "../schemas/http";
import { publicMetadata } from "../utils/dictionary";
import type { Dictionary, Services } from "../types/services";

const metadata = DictionarySchema.extend({
  status: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
const response = (schema: z.ZodType) => ({
  description: "查询成功",
  content: { "application/json": { schema } },
});
const failure = { description: "查询失败", ...JsonErrorResponse };
const errors = {
  400: failure,
  401: failure,
  403: failure,
  404: failure,
  409: failure,
  413: failure,
  500: failure,
};
const params = z.object({ id: DictionaryIdSchema });

/** 后台只返回管理界面需要的元数据，不暴露 COS 路径。 */
export function adminMetadata(row: Dictionary) {
  return {
    ...publicMetadata(row),
    status: row.status || "published",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createRoutes(services: Services) {
  const app = new OpenAPIHono({ defaultHook: zodValidationErrorHandler });
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/admin/dictionaries",
      tags: ["Admin"],
      security: authSecurity,
      request: {
        query: z.object({
          page: z.coerce.number().int().min(1).max(100000).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          q: z.string().trim().max(100).optional(),
          category: z.string().trim().max(100).optional(),
          kind: z.enum(["word", "phrase"]).optional(),
          status: z.enum(["published", "draft", "archived"]).optional(),
        }),
      },
      responses: {
        200: response(
          z.object({
            dictionaries: z.array(metadata),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
        ),
        ...errors,
      },
    }),
    async (c) => {
      if (!services.listAdmin) throw new Error("后台题库查询未配置");
      const query = c.req.valid("query");
      const result = await services.listAdmin(query);
      return c.json(
        {
          ...result,
          dictionaries: result.dictionaries.map(adminMetadata),
          page: query.page,
          pageSize: query.pageSize,
        },
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/admin/dictionaries/{id}",
      tags: ["Admin"],
      security: authSecurity,
      request: { params },
      responses: {
        200: response(z.object({ dictionary: metadata })),
        ...errors,
      },
    }),
    async (c) => {
      const row = await services.get(c.req.valid("param").id);
      if (!row) return c.json({ error: "题库不存在" }, 404);
      return c.json({ dictionary: adminMetadata(row) }, 200);
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/admin/dictionaries/{id}/content",
      tags: ["Admin"],
      security: authSecurity,
      request: {
        params,
        query: z.object({
          offset: z.coerce.number().int().min(0).default(0),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          version: z.string().regex(/^[a-f0-9]{64}$/),
        }),
      },
      responses: {
        200: response(
          z.object({
            items: z.array(z.unknown()),
            next: z.number().nullable(),
            total: z.number(),
            sha256: z.string(),
          }),
        ),
        ...errors,
      },
    }),
    async (c) => {
      const row = await services.get(c.req.valid("param").id);
      if (!row || !row.fileID?.startsWith("cloud://"))
        return c.json({ error: "题库不存在" }, 404);
      const { offset, limit, version } = c.req.valid("query");
      if (version !== row.sha256)
        return c.json({ error: "题库已更新，请刷新详情" }, 409);
      const rows = JSON.parse(
        (await services.download(row.fileID))
          .toString("utf8")
          .replace(/^\uFEFF/, ""),
      );
      if (!Array.isArray(rows) || rows.length !== row.wordCount)
        throw new Error("题库文件与目录不一致");
      if (offset > rows.length) return c.json({ error: "分页位置无效" }, 400);
      const items: unknown[] = [];
      let size = 0;
      for (const item of rows.slice(offset, offset + limit)) {
        const bytes = Buffer.byteLength(JSON.stringify(item), "utf8") + 1;
        if (bytes > 240 * 1024) return c.json({ error: "单条题目过大" }, 413);
        if (size + bytes > 240 * 1024) break;
        items.push(item);
        size += bytes;
      }
      const next = offset + items.length;
      return c.json(
        {
          items,
          next: next < rows.length ? next : null,
          total: rows.length,
          sha256: row.sha256,
        },
        200,
      );
    },
  );
  return app;
}
