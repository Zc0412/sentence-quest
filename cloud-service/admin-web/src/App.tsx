/** 后台应用入口：组合会话提供器与独立路由表。 */
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./query";
import AuthProvider from "./auth/AuthProvider";
import AppRoutes from "./routes";

const queryClient = createQueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}
