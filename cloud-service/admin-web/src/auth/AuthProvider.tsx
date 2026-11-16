/** 会话管理：通过 React Query 恢复 Cookie 会话，隔离不同账号的缓存。 */
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Result, Spin } from "antd";
import { api, ApiError, type User } from "../api";
import { clearAdminCache, sessionKey } from "../query";

const AuthContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({ user: null, setUser: () => {} });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useQueryClient();
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      try {
        return (await api<{ user: User }>("/auth/me", { signal })).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
    refetchOnReconnect: false,
  });
  const setUser = useCallback(
    (user: User | null) => {
      clearAdminCache(client);
      client.setQueryData(sessionKey, user);
    },
    [client],
  );
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [setUser]);
  if (session.isPending)
    return <Spin size="large" tip="正在连接工作台" fullscreen />;
  if (session.isError)
    return (
      <Result
        status="warning"
        title="暂时无法连接服务"
        subTitle={session.error.message}
        extra={
          <Button
            loading={session.isFetching}
            onClick={() => void session.refetch()}
          >
            重新连接
          </Button>
        }
      />
    );
  return (
    <AuthContext.Provider value={{ user: session.data, setUser }}>
      <Fragment key={session.data?.id || "anonymous"}>{children}</Fragment>
    </AuthContext.Provider>
  );
}
