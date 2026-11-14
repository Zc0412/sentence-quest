/** 后台布局：导航、当前账号及退出操作，页面由 Outlet 渲染。 */
import { useState } from "react";
import { App as AntApp, Avatar, Button, Layout, Menu } from "antd";
import {
  BookOutlined,
  LogoutOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { api, json } from "../api";
import { useAuth } from "../auth/AuthProvider";
export default function AdminLayout() {
  const { user, setUser } = useAuth();
  const { message } = AntApp.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  const selected =
    location.pathname === "/dictionaries/new"
      ? "/dictionaries/new"
      : location.pathname.startsWith("/dictionaries")
        ? "/dictionaries"
        : location.pathname;
  async function logout() {
    setLoggingOut(true);
    try {
      await api("/auth/logout", json("POST"));
      setUser(null);
      navigate("/login");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <Layout className="app-layout">
      <Layout.Sider
        width={232}
        breakpoint="lg"
        collapsedWidth={0}
        className="sidebar"
      >
        <Link to="/dictionaries" className="brand">
          <span className="brand-mark">S↗</span>
          <span>
            SentLeap<small>内容管理工作台</small>
          </span>
        </Link>
        <div className="nav-caption">内容工作区</div>
        <Menu
          theme="dark"
          selectedKeys={[selected]}
          onClick={({ key }) => navigate(key)}
          items={[
            { key: "/dictionaries", icon: <BookOutlined />, label: "题库管理" },
            {
              key: "/dictionaries/new",
              icon: <PlusOutlined />,
              label: "新建题库",
            },
            ...(user.role === "super_admin"
              ? [
                  { key: "/users", icon: <TeamOutlined />, label: "管理员" },
                  {
                    key: "/invites",
                    icon: <SafetyCertificateOutlined />,
                    label: "邀请管理",
                  },
                ]
              : []),
            { key: "/account", icon: <UserOutlined />, label: "账号设置" },
          ]}
        />
        <div className="sidebar-note">
          <span className="live-dot" /> 内容运营后台
          <br />
          <small>每一句，都值得认真打磨。</small>
        </div>
      </Layout.Sider>
      <Layout className="workspace">
        <header className="topbar">
          <span>
            工作台 <span className="topbar-divider">/</span> 内容与账号
          </span>
          <div className="user-tools">
            <Avatar
              size="small"
              style={{ background: "#d9e9df", color: "#247457" }}
            >
              {user.nickname.slice(0, 1)}
            </Avatar>
            <span>{user.nickname}</span>
            <span className="role-label">
              {user.role === "super_admin" ? "超级管理员" : "管理员"}
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              loading={loggingOut}
              onClick={logout}
            >
              退出
            </Button>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          SENTLEAP ADMIN <span>用好的内容，陪伴每一次进步。</span>
        </footer>
      </Layout>
    </Layout>
  );
}
