/** 题库列表页：从管理接口查询题库，支持筛选、分页及归档删除。 */
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { dateText, json, type Dictionary } from "../api";
import {
  ErrorNotice,
  kindOptions,
  PageHeading,
  StatusTag,
  statusOptions,
  useResource,
} from "../shared";
import { useApiMutation } from "../query";

type ListResult = {
  dictionaries: Dictionary[];
  total: number;
  page: number;
  pageSize: number;
};
type ContentResult = {
  items: Record<string, unknown>[];
  next: number | null;
  total: number;
  sha256: string;
};

export default function DictionariesPage() {
  const [params, setParams] = useSearchParams();
  const resource = useResource<ListResult>(
    `/dictionaries?${params.toString()}`,
  );
  const navigate = useNavigate();
  const { message } = App.useApp();
  const deletion = useApiMutation("/dictionaries");
  /** 删除沿用服务端归档语义，成功后刷新全部题库查询。 */
  async function deleteDictionary(row: Dictionary) {
    try {
      await deletion.mutateAsync({
        path: `/dictionaries/${encodeURIComponent(row.id)}`,
        options: json("DELETE"),
      });
      message.success("题库已删除（归档），可在详情页重新发布");
    } catch (error) {
      message.error((error as Error).message);
    }
  }
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({
      q: params.get("q") || "",
      category: params.get("category") || "",
      kind: params.get("kind") || undefined,
      status: params.get("status") || undefined,
    });
  }, [params, form]);
  function filter(values: Record<string, string>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(values))
      if (value?.trim()) next.set(key, value.trim());
    next.set("page", "1");
    setParams(next);
  }
  return (
    <>
      <PageHeading
        eyebrow="CONTENT LIBRARY"
        title="题库管理"
        description="整理每一份学习内容，从草稿到发布，一目了然。"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate("/dictionaries/new")}
          >
            新建题库
          </Button>
        }
      />
      <div className="library-banner">
        <div className="banner-icon" aria-hidden="true">
          Aa↗
        </div>
        <div>
          <h3>让每一次练习，都有好内容</h3>
          <p>上传题库、检查内容，再发布给学习者。归档不会删除已有云文件。</p>
        </div>
        <span className="banner-label">CONTENT STUDIO</span>
      </div>
      <Card className="panel library-panel">
        <Form
          form={form}
          className="filter-form"
          layout="inline"
          onFinish={filter}
        >
          <Form.Item name="q">
            <Input
              allowClear
              placeholder="搜索题库名称或 ID"
              aria-label="搜索题库名称或 ID"
            />
          </Form.Item>
          <Form.Item name="kind">
            <Select
              allowClear
              placeholder="全部类型"
              aria-label="题库类型"
              options={kindOptions}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="全部状态"
              aria-label="发布状态"
              options={statusOptions}
            />
          </Form.Item>
          <Form.Item name="category">
            <Input allowClear placeholder="分类名称" aria-label="分类名称" />
          </Form.Item>
          <Space>
            <Button htmlType="submit" type="primary">
              筛选
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setParams({});
              }}
            >
              重置
            </Button>
          </Space>
        </Form>
        <div className="table-heading">
          <span>
            题库目录 <strong>{resource.data?.total ?? "—"}</strong>
          </span>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={resource.reload}
          >
            刷新
          </Button>
        </div>
        <ErrorNotice error={resource.error} retry={resource.reload} />
        <Table
          rowKey="id"
          loading={resource.loading}
          dataSource={resource.data?.dictionaries}
          scroll={{ x: 850 }}
          locale={{ emptyText: <Empty description="暂无符合条件的题库" /> }}
          pagination={{
            current: resource.data?.page || Number(params.get("page")) || 1,
            pageSize: resource.data?.pageSize || 20,
            total: resource.data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个题库`,
            onChange: (page, pageSize) => {
              const next = new URLSearchParams(params);
              next.set("page", String(page));
              next.set("pageSize", String(pageSize));
              setParams(next);
            },
          }}
          columns={[
            {
              title: "题库",
              dataIndex: "label",
              render: (_, row) => (
                <Link
                  className="dictionary-name"
                  to={`/dictionaries/${encodeURIComponent(row.id)}`}
                >
                  <span className="dictionary-icon">
                    <FileTextOutlined />
                  </span>
                  <span>
                    <strong>{row.label}</strong>
                    <small>{row.id}</small>
                  </span>
                </Link>
              ),
            },
            {
              title: "类型",
              render: (_, row) => (row.kind === "word" ? "单词" : "短语"),
            },
            { title: "分类", dataIndex: "category" },
            { title: "条目数", dataIndex: "wordCount", align: "right" },
            {
              title: "状态",
              render: (_, row) => <StatusTag status={row.status} />,
            },
            { title: "更新时间", render: (_, row) => dateText(row.updatedAt) },
            {
              title: "操作",
              render: (_, row) => (
                <Space>
                  <Link to={`/dictionaries/${encodeURIComponent(row.id)}`}>
                    查看详情 →
                  </Link>
                  <Popconfirm
                    title={`删除「${row.label}」？`}
                    description="删除后归档并从学习端云目录下架，记录与文件保留，可重新发布。"
                    okText="删除题库"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deleteDictionary(row)}
                    disabled={row.status === "archived" || deletion.isPending}
                  >
                    <Button
                      type="link"
                      danger
                      disabled={row.status === "archived" || deletion.isPending}
                      loading={
                        deletion.isPending &&
                        deletion.variables?.path ===
                          `/dictionaries/${encodeURIComponent(row.id)}`
                      }
                    >
                      {row.status === "archived" ? "已归档" : "删除"}
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <p className="page-note">
        这里展示全部发布状态的题库。只有已发布内容会出现在学习端云目录中。
      </p>
    </>
  );
}
