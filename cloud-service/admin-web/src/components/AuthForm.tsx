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
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">S↗</span>SentLeap
        </div>
        <div>
          <div className="eyebrow">A LITTLE LEAP, EVERY DAY</div>
          <h1>
            好内容，
            <br />
            让进步发生。
          </h1>
          <p>
            管理每一个单词与短语，
            <br />
            为下一次学习准备好起点。
          </p>
        </div>
        <small>SENTLEAP · CONTENT STUDIO</small>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <div className="eyebrow">欢迎来到内容工作台</div>
          <h2>{register ? "加入管理团队" : "登录后台"}</h2>
          <p>
            {register
              ? "使用超级管理员提供的邀请码创建账号。"
              : "使用管理员账号继续。"}
          </p>
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
          <div className="auth-note">
            后台账号仅用于内容管理，与学习端本地资料独立。
          </div>
        </div>
      </section>
    </div>
  );
}
