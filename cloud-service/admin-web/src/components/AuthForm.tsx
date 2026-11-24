/** 登录与邀请注册页面：居中展示表单，通过云服务建立管理员会话。 */
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
import { dateText, json, type Invite, type User } from "../api";
import { useApiMutation } from "../query";
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

export default function AuthForm({ register = false }: { register?: boolean }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const mutation = useApiMutation<{ user: User }>();
  const busy = mutation.isPending;
  const [error, setError] = useState<Error>();
  async function submit(values: Record<string, string>) {
    setError(undefined);
    try {
      if (register) {
        await mutation.mutateAsync({
          path: "/auth/register",
          options: json("POST", values),
        });
        message.success("账号已创建，请登录");
        navigate("/login");
      } else {
        const { user } = await mutation.mutateAsync({
          path: "/auth/login",
          options: json("POST", values),
        });
        setUser(user);
        navigate("/dictionaries");
      }
    } catch (error) {
      setError(error as Error);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-form">
        <div className="auth-form-inner">
          <h2>{register ? "加入管理团队" : "登录后台"}</h2>
          <ErrorNotice error={error} />
          <Form
            key={String(register)}
            layout="vertical"
            onFinish={submit}
            disabled={busy}
            requiredMark={false}
          >
            <Form.Item name="username" label="用户名" rules={usernameRules}>
              <Input
                size="large"
                autoComplete="username"
                placeholder="输入管理员用户名"
              />
            </Form.Item>
            {register && (
              <Form.Item
                name="nickname"
                label="昵称"
                rules={[{ required: true, whitespace: true, max: 50 }]}
              >
                <Input size="large" />
              </Form.Item>
            )}
            <Form.Item name="password" label="密码" rules={passwordRules}>
              <Input.Password
                size="large"
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="输入密码"
              />
            </Form.Item>
            {register && (
              <Form.Item
                name="inviteCode"
                label="邀请码"
                rules={[
                  { required: true },
                  {
                    pattern: /^[A-Za-z0-9_-]{43}$/,
                    message: "邀请码格式不正确",
                  },
                ]}
              >
                <Input size="large" autoComplete="off" />
              </Form.Item>
            )}
            <Button
              block
              type="primary"
              htmlType="submit"
              size="large"
              loading={busy}
            >
              {register ? "创建账号" : "登录工作台"}
            </Button>
          </Form>
          <p className="auth-link">
            {register ? (
              <Link to="/login">已有账号，返回登录</Link>
            ) : (
              <Link to="/register">有邀请码？注册管理员账号</Link>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
