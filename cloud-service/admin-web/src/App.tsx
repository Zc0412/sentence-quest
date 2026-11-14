/** 后台应用入口：组合会话提供器与独立路由表。 */
import AuthProvider from "./auth/AuthProvider";
import AppRoutes from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
