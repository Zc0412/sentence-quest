/** 后台请求状态与缓存：按接口路径区分查询，会话变更时清除业务数据。 */
import {
  QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";

export const sessionKey = ["session"] as const;
export const resourceKey = (path: string) => ["admin", path] as const;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

/** 同时失效一个资源的全部筛选、分页及详情缓存。 */
export function invalidateResource(client: QueryClient, prefix: string) {
  return client.invalidateQueries({
    predicate: ({ queryKey }) => {
      const path = queryKey[1];
      return (
        queryKey[0] === "admin" &&
        typeof path === "string" &&
        (path === prefix ||
          path.startsWith(`${prefix}?`) ||
          path.startsWith(`${prefix}/`))
      );
    },
  });
}

/** 先取消在途查询再移除缓存，防止旧账号的迟到响应写回。 */
export function clearAdminCache(client: QueryClient) {
  void client.cancelQueries();
  client.removeQueries({ queryKey: ["admin"] });
  client.getMutationCache().clear();
}

export function useApiMutation<T = unknown>(invalidate?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path, options }: { path: string; options: RequestInit }) =>
      api<T>(path, options),
    onSuccess: () =>
      invalidate ? invalidateResource(client, invalidate) : undefined,
  });
}
