/** 账号页面：复用云服务登录、邀请注册、会话撤销和角色权限接口。 */
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import { api, dateText, json, type Invite, type User } from "../api";
import { useAuth } from "../auth/AuthProvider";
import { ErrorNotice, PageHeading, useResource } from "../shared";

const usernameRules = [
  { required: true, message: "请输入用户名" },
  { pattern: /^[a-zA-Z0-9_]{3,32}$/, message: "3–32 位字母、数字或下划线" },
];
const passwordRules = [
  { required: true, message: "请输入密码" },
  { min: 6, max: 128, message: "密码长度为 6–128 位" },
];

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  async function changePassword(values: {
    oldPassword: string;
    newPassword: string;
    confirm: string;
  }) {
    setBusy(true);
    setError(undefined);
    try {
      await api(
        "/auth/password",
        json("PUT", {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      );
      message.success("密码已更新，请重新登录");
      setUser(null);
    } catch (error) {
      setError(error as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT"
        title="账号设置"
        description="管理你的后台身份与登录安全。"
      />
      <Card className="panel" title="账号信息">
        <Descriptions
          items={[
            { key: "username", label: "用户名", children: user?.username },
            { key: "name", label: "昵称", children: user?.nickname },
            {
              key: "role",
              label: "角色",
              children: user?.role === "super_admin" ? "超级管理员" : "管理员",
            },
          ]}
        />
      </Card>
      <Card className="panel narrow-panel" title="修改密码">
        <p className="muted">修改成功后，所有设备上的后台会话都会退出。</p>
        <ErrorNotice error={error} />
        <Form layout="vertical" onFinish={changePassword} disabled={busy}>
          <Form.Item name="oldPassword" label="当前密码" rules={passwordRules}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={passwordRules}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={["newPassword"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value === getFieldValue("newPassword")
                    ? Promise.resolve()
                    : Promise.reject(new Error("两次密码不一致")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy}>
            更新密码
          </Button>
        </Form>
      </Card>
    </>
  );
}
