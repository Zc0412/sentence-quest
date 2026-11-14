import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** 代理参数仅在 Node 构建配置中使用，保留 Origin 供服务端校验。 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "ADMIN_"), ...process.env };
  const port = Number(env.ADMIN_DEV_PORT || 5173);
  const target = env.ADMIN_API_PROXY || "http://127.0.0.1:8080";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("ADMIN_DEV_PORT 必须为 1–65535 的整数");
  }
  const url = new URL(target);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("ADMIN_API_PROXY 必须为不带凭据、路径或查询参数的 HTTP(S) 来源");
  }
  return {
    plugins: [react()],
    base: "/admin/",
    server: {
      host: env.ADMIN_DEV_HOST || "127.0.0.1",
      port,
      strictPort: true,
      // 代理只转发请求；浏览器页面来源需加入 service 的 ADMIN_ALLOWED_ORIGINS。
      proxy: { "/api": { target } },
    },
  };
});
