/** 后台路由表：页面各自独立，按登录状态与角色设置访问入口。 */
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Result } from "antd";
import { useAuth } from "./auth/AuthProvider";
import SuperAdmin from "./auth/SuperAdmin";
import AdminLayout from "./layouts/AdminLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountPage from "./pages/AccountPage";
import UsersPage from "./pages/UsersPage";
import InvitesPage from "./pages/InvitesPage";
import DictionariesPage from "./pages/DictionariesPage";
import DictionaryPage from "./pages/DictionaryPage";
import UploadPage from "./pages/UploadPage";
export default function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dictionaries" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={
          user ? <Navigate to="/dictionaries" replace /> : <RegisterPage />
        }
      />
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/dictionaries" replace />} />
        <Route path="/dictionaries" element={<DictionariesPage />} />
        <Route path="/dictionaries/new" element={<UploadPage />} />
        <Route path="/dictionaries/:id" element={<DictionaryPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route
          path="/users"
          element={
            <SuperAdmin>
              <UsersPage />
            </SuperAdmin>
          }
        />
        <Route
          path="/invites"
          element={
            <SuperAdmin>
              <InvitesPage />
            </SuperAdmin>
          }
        />
        <Route
          path="*"
          element={
            <Result
              status="404"
              title="页面不存在"
              extra={<Link to="/dictionaries">返回题库管理</Link>}
            />
          }
        />
      </Route>
    </Routes>
  );
}
