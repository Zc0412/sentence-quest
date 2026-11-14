/** 浏览器只使用 HttpOnly 会话 Cookie，不持久化登录返回的 Bearer token。 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: string[] = [],
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new ApiError(
      body.error || `请求失败（${response.status}）`,
      response.status,
      body.details || [],
    );
  }
  return body;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export interface User {
  id: string;
  username: string;
  nickname: string;
  role: "super_admin" | "admin";
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt: string | null;
}
export interface Dictionary {
  id: string;
  label: string;
  kind: "word" | "phrase";
  category: string;
  status: "draft" | "published" | "archived";
  wordCount: number;
  sha256: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Invite {
  id: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}
export const dateText = (value?: string | null) =>
  value ? new Date(value).toLocaleString("zh-CN") : "—";
