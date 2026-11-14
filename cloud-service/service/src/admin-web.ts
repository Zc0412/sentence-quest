/** 同源托管后台构建产物；仅 /admin 页面路由回退到入口，API 保留真实错误。 */
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import type { Hono } from "hono";

export function mountAdminWeb(app: Hono, root = "../admin-web/dist") {
  app.get("/admin", (c) => c.redirect("/admin/"));
  app.get("/admin/*", async (c, next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    if (!existsSync(`${root}/index.html`)) {
      return c.text("后台尚未构建，请先构建 admin-web。", 503);
    }
    return next();
  });
  app.get(
    "/admin/*",
    serveStatic({
      root,
      rewriteRequestPath: (path) => path.replace(/^\/admin/, ""),
    }),
  );
  app.get("/admin/*", async (c, next) => {
    // 缺失资源不能返回 HTML；题库 ID 可含点号，不能按扩展名误判详情页。
    if (c.req.path.startsWith("/admin/assets/")) return c.notFound();
    c.header("Cache-Control", "no-cache");
    const result = await serveStatic({ path: `${root}/index.html` })(c, next);
    return result || c.res;
  });
}
