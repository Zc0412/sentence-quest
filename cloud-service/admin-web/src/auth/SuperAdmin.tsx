/** 超级管理员页面守卫；接口权限仍由服务端校验。 */
import { Result } from "antd";
import { useAuth } from "./AuthProvider";
export default function SuperAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  return useAuth().user?.role === "super_admin" ? (
    children
  ) : (
    <Result status="403" title="仅超级管理员可访问" />
  );
}
