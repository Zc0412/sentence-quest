/** 会话管理：恢复 HttpOnly Cookie 会话，并处理会话过期。 */
import { createContext, useContext, useEffect, useState } from "react";
import { Button, Result, Spin } from "antd";
import { api, type User } from "../api";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api<{ user: User }>("/auth/me", { signal: controller.signal })
      .then(({ user }) => {
        if (!controller.signal.aborted) {
          setUser(user);
          setError(undefined);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.status !== 401) setError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => {
      controller.abort();
      window.removeEventListener("session-expired", expired);
    };
  }, [revision]);
  if (loading)
    return (
      <div className="fullscreen-state">
        <Spin size="large" tip="正在连接工作台" fullscreen />
      </div>
    );
  if (error)
    return (
      <Result
        status="warning"
        title="暂时无法连接服务"
        subTitle={error.message}
        extra={
          <Button
            onClick={() => {
              setError(undefined);
              setRevision((value) => value + 1);
            }}
          >
            重新连接
          </Button>
        }
      />
    );
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
