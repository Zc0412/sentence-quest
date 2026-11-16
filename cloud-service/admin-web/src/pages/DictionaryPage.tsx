/** 题库页面：管理全状态题库、只读预览内容、上传草稿及发布归档。 */
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
import { parseEntries } from "../upload";

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

export default function DictionaryPage() {
  const { id = "" } = useParams();
  return <DictionaryDetail key={id} id={id} />;
}
function DictionaryDetail({ id }: { id: string }) {
  const resource = useResource<{ dictionary: Dictionary }>(
    `/dictionaries/${encodeURIComponent(id)}`,
  );
  const row = resource.data?.dictionary;
  const [offsets, setOffsets] = useState([0]);
  const offset = offsets[offsets.length - 1];
  const content = useResource<ContentResult>(
    row
      ? `/dictionaries/${encodeURIComponent(id)}/content?offset=${offset}&version=${row.sha256}`
      : null,
  );
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const mutation = useApiMutation<unknown>("/dictionaries");
  const busy = mutation.isPending;
  const [error, setError] = useState<Error>();
  const [form] = Form.useForm();
  async function mutate(values: Record<string, string>, archive = false) {
    setError(undefined);
    try {
      await mutation.mutateAsync({
        path: `/dictionaries/${encodeURIComponent(id)}`,
        options: archive ? json("DELETE") : json("PUT", values),
      });
      message.success("题库已更新");
      setEditing(false);
    } catch (error) {
      setError(error as Error);
    }
  }
  if (!row)
    return (
      <>
        <Link to="/dictionaries">← 返回题库列表</Link>
        <ErrorNotice error={resource.error} retry={resource.reload} />
        {resource.loading && <Spin />}
      </>
    );
  return (
    <>
      <Link className="back-link" to="/dictionaries">
        <ArrowLeftOutlined /> 返回题库列表
      </Link>
      <PageHeading
        eyebrow="DICTIONARY DETAIL"
        title={row.label}
        description={`${row.id} · ${row.kind === "word" ? "单词题库" : "短语题库"} · ${row.wordCount} 条内容`}
        action={
          <Space>
            <Button
              disabled={busy}
              onClick={() => {
                form.setFieldsValue({
                  label: row.label,
                  category: row.category,
                });
                setEditing(true);
              }}
            >
              编辑资料
            </Button>
            {row.status !== "published" && (
              <Popconfirm
                title="发布此题库？"
                description="发布后将出现在学习端云目录中。"
                onConfirm={() => mutate({ status: "published" })}
              >
                <Button type="primary" loading={busy}>
                  {row.status === "archived" ? "重新发布" : "发布题库"}
                </Button>
              </Popconfirm>
            )}
            {row.status !== "archived" && (
              <Popconfirm
                title="归档此题库？"
                description="题库将从公开目录下架，数据库记录和文件保留。"
                onConfirm={() => mutate({}, true)}
              >
                <Button danger disabled={busy}>
                  归档下架
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      />
      <ErrorNotice error={error} />
      <Card className="panel" title="题库资料">
        <Descriptions
          column={{ xs: 1, md: 2 }}
          items={[
            {
              key: "status",
              label: "发布状态",
              children: <StatusTag status={row.status} />,
            },
            { key: "category", label: "分类", children: row.category },
            {
              key: "created",
              label: "创建时间",
              children: dateText(row.createdAt),
            },
            {
              key: "updated",
              label: "更新时间",
              children: dateText(row.updatedAt),
            },
            {
              key: "version",
              label: "内容版本",
              span: 2,
              children: (
                <Typography.Text className="hash" copyable>
                  {row.sha256}
                </Typography.Text>
              ),
            },
          ]}
        />
      </Card>
      <Card
        className="panel"
        title="内容预览"
        extra={<span className="muted">保留题目原始顺序 · 只读</span>}
      >
        <ErrorNotice
          error={content.error}
          retry={() => {
            resource.reload();
            content.reload();
          }}
        />
        <Table
          rowKey={(_, index) => String(offset + (index || 0))}
          loading={content.loading}
          dataSource={content.data?.items}
          pagination={false}
          scroll={{ x: 500 }}
          columns={[
            {
              title: "序号",
              width: 70,
              render: (_, __, index) => offset + index + 1,
            },
            {
              title: "英文",
              render: (_, entry) => String(entry.name || entry.english || ""),
            },
            {
              title: "释义 / 中文",
              render: (_, entry) =>
                Array.isArray(entry.trans)
                  ? entry.trans.map(String).join("；")
                  : String(entry.zh || ""),
            },
          ]}
          expandable={{
            expandedRowRender: (entry) => (
              <pre className="json-preview">
                {JSON.stringify(entry, null, 2)}
              </pre>
            ),
          }}
        />
        <div className="content-pagination">
          <span className="muted">
            共 {content.data?.total ?? row.wordCount} 条
          </span>
          <Space>
            <Button
              disabled={offsets.length === 1 || content.loading}
              onClick={() => setOffsets((value) => value.slice(0, -1))}
            >
              上一页
            </Button>
            <Button
              disabled={content.data?.next == null || content.loading}
              onClick={() =>
                setOffsets((value) => [...value, content.data!.next!])
              }
            >
              下一页
            </Button>
          </Space>
        </div>
      </Card>
      <Alert
        type="info"
        showIcon
        title="题库 ID、类型与条目顺序关联学习进度，当前不支持替换已上传的题库内容。"
      />
      <Modal
        title="编辑题库资料"
        open={editing}
        onCancel={() => {
          if (!busy) setEditing(false);
        }}
        onOk={() => form.submit()}
        confirmLoading={busy}
      >
        <ErrorNotice error={error} />
        <Form
          form={form}
          layout="vertical"
          disabled={busy}
          onFinish={(values) => mutate(values)}
        >
          <Form.Item
            name="label"
            label="名称"
            rules={[{ required: true, whitespace: true, max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, whitespace: true, max: 100 }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
