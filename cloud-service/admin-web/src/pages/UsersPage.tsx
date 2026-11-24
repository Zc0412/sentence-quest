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

export default function UsersPage() {
  const resource = useResource<{ users: User[] }>("/users");
  const { user } = useAuth();
  const { message } = App.useApp();
  const mutation = useApiMutation<unknown>("/users");
  const busy = mutation.isPending
    ? mutation.variables?.path.split("/")[2]
    : undefined;
  async function setStatus(row: User) {
    try {
      await mutation.mutateAsync({
        path: `/users/${row.id}/status`,
        options: json("PATCH", {
          status: row.status === "active" ? "disabled" : "active",
        }),
      });
      message.success("账号状态已更新");
    } catch (error) {
      message.error((error as Error).message);
    }
  }
  return (
    <>
      <PageHeading title="管理员" />
      <ErrorNotice error={resource.error} retry={resource.reload} />
      <Card className="panel">
        <Table
          rowKey="id"
          loading={resource.loading}
          dataSource={resource.data?.users}
          scroll={{ x: 700 }}
          columns={[
            { title: "用户名", dataIndex: "username" },
            { title: "昵称", dataIndex: "nickname" },
            {
              title: "角色",
              render: (_, row) =>
                row.role === "super_admin" ? "超级管理员" : "管理员",
            },
            {
              title: "状态",
              render: (_, row) => (
                <Tag color={row.status === "active" ? "green" : "default"}>
                  {row.status === "active" ? "正常" : "已禁用"}
                </Tag>
              ),
            },
            {
              title: "最近登录",
              render: (_, row) => dateText(row.lastLoginAt),
            },
            {
              title: "操作",
              render: (_, row) => (
                <Popconfirm
                  title={
                    row.status === "active"
                      ? "禁用此账号并撤销其会话？"
                      : "恢复此账号？"
                  }
                  onConfirm={() => setStatus(row)}
                  disabled={row.id === user?.id || !!busy}
                >
                  <Button
                    type="link"
                    danger={row.status === "active"}
                    disabled={row.id === user?.id || !!busy}
                    loading={busy === row.id}
                  >
                    {row.id === user?.id
                      ? "当前账号"
                      : row.status === "active"
                        ? "禁用"
                        : "恢复"}
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
