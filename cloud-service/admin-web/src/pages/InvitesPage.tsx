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

export default function InvitesPage() {
  const resource = useResource<{ invites: Invite[] }>("/invites");
  const { message } = App.useApp();
  const [hours, setHours] = useState(24);
  const mutation = useApiMutation<{ inviteCode: string; expiresAt: string }>(
    "/invites",
  );
  const busy = mutation.isPending;
  const [created, setCreated] = useState<{
    inviteCode: string;
    expiresAt: string;
  }>();
  async function create() {
    try {
      setCreated(
        await mutation.mutateAsync({
          path: "/invites",
          options: json("POST", { expiresInHours: hours }),
        }),
      );
    } catch (error) {
      message.error((error as Error).message);
    }
  }
  async function revoke(id: string) {
    try {
      await mutation.mutateAsync({
        path: `/invites/${id}`,
        options: json("DELETE"),
      });
      message.success("邀请已撤销");
    } catch (error) {
      message.error((error as Error).message);
    }
  }
  const state = (row: Invite) =>
    row.usedAt
      ? "已使用"
      : row.revokedAt
        ? "已撤销"
        : Date.parse(row.expiresAt) <= Date.now()
          ? "已过期"
          : "有效";
  return (
    <>
      <PageHeading title="邀请管理" />
      <Card className="panel">
        <Space wrap>
          <span>有效时间</span>
          <InputNumber
            aria-label="邀请有效小时数"
            min={1}
            max={168}
            precision={0}
            value={hours}
            onChange={(value) => setHours(value || 24)}
            suffix="小时"
          />
          <Button type="primary" onClick={create} loading={busy}>
            生成邀请码
          </Button>
          <span className="muted">仅创建时展示一次，请妥善交付。</span>
        </Space>
      </Card>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      <Card className="panel" title="最近 100 条邀请">
        <Table
          rowKey="id"
          loading={resource.loading}
          dataSource={resource.data?.invites}
          scroll={{ x: 650 }}
          columns={[
            { title: "创建时间", render: (_, row) => dateText(row.createdAt) },
            { title: "到期时间", render: (_, row) => dateText(row.expiresAt) },
            {
              title: "状态",
              render: (_, row) => (
                <Tag color={state(row) === "有效" ? "green" : "default"}>
                  {state(row)}
                </Tag>
              ),
            },
            { title: "使用时间", render: (_, row) => dateText(row.usedAt) },
            {
              title: "操作",
              render: (_, row) => (
                <Popconfirm
                  title="撤销此邀请？"
                  onConfirm={() => revoke(row.id)}
                  disabled={state(row) !== "有效" || busy}
                >
                  <Button
                    type="link"
                    danger
                    disabled={state(row) !== "有效" || busy}
                  >
                    撤销
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="邀请码已生成"
        open={!!created}
        onCancel={() => setCreated(undefined)}
        footer={
          <Button onClick={() => setCreated(undefined)}>已保存，关闭</Button>
        }
      >
        <Alert type="warning" showIcon title="关闭后无法再次查看此邀请码" />
        <Typography.Paragraph className="invite-code" copyable>
          {created?.inviteCode}
        </Typography.Paragraph>
        <p>有效期至 {dateText(created?.expiresAt)}</p>
      </Modal>
    </>
  );
}
