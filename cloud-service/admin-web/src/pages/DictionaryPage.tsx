/** 题库详情页：读取资料和内容，支持编辑、发布及永久删除。 */
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
import { useApiMutation, useDeleteDictionary } from "../query";
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
  const [entryEdit, setEntryEdit] = useState<{
    index: number;
    version: string;
    original: Record<string, unknown>;
  }>();
  const [entryText, setEntryText] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>>();
  const [entryError, setEntryError] = useState<Error>();
  const mutation = useApiMutation<unknown>("/dictionaries");
  const deletion = useDeleteDictionary();
  const navigate = useNavigate();
  const busy = mutation.isPending || deletion.isPending;
  const [error, setError] = useState<Error>();
  const [form] = Form.useForm();
  async function mutate(values: Record<string, string>) {
    setError(undefined);
    try {
      await mutation.mutateAsync({
        path: `/dictionaries/${encodeURIComponent(id)}`,
        options: json("PUT", values),
      });
      message.success("题库已更新");
      setEditing(false);
    } catch (error) {
      setError(error as Error);
    }
  }
  /** 校验单条 JSON 后预览；固定原始索引及打开时版本，避免覆盖并发更新。 */
  function previewEntry() {
    try {
      const value = JSON.parse(entryText);
      if (
        !row ||
        !entryEdit ||
        !value ||
        Array.isArray(value) ||
        typeof value !== "object"
      ) {
        throw new Error("请输入单个题目的 JSON 对象");
      }
      parseEntries(JSON.stringify([value]), row.kind);
      const key = row.kind === "word" ? "name" : "id";
      if (
        value[key] !== entryEdit.original[key] ||
        value.id !== entryEdit.original.id
      ) {
        throw new Error("不能修改单词名称或题目 ID");
      }
      setPreview(value);
      setEntryError(undefined);
    } catch (error) {
      setEntryError(error as Error);
    }
  }
  async function saveEntry() {
    if (!entryEdit || !preview) return;
    try {
      await mutation.mutateAsync({
        path: `/dictionaries/${encodeURIComponent(id)}`,
        options: json("PUT", {
          edit: {
            index: entryEdit.index,
            version: entryEdit.version,
            entry: preview,
          },
        }),
      });
      setEntryEdit(undefined);
      message.success("题目已保存，内容版本已更新");
    } catch (error) {
      setEntryError(error as Error);
    }
  }
  async function deleteDictionary() {
    setError(undefined);
    try {
      await deletion.mutateAsync(id);
      message.success("题库文件和记录已永久删除");
      navigate("/dictionaries", { replace: true });
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
        title={row.label}
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
            <Popconfirm
              title="永久删除此题库？"
              description="将永久删除题库文件及数据库记录，无法恢复。已下载到用户设备的内容不会被远程清除。"
              okText="删除题库"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={busy}
              onConfirm={deleteDictionary}
            >
              <Button danger disabled={busy} loading={deletion.isPending}>
                删除题库
              </Button>
            </Popconfirm>
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
        extra={<span className="muted">保留题目原始顺序</span>}
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
              title: "操作",
              width: 80,
              render: (_, entry, index) => (
                <Button
                  type="link"
                  disabled={
                    busy ||
                    content.loading ||
                    content.data?.sha256 !== row.sha256
                  }
                  onClick={() => {
                    setEntryEdit({
                      index: offset + index,
                      version: row.sha256,
                      original: entry,
                    });
                    setEntryText(JSON.stringify(entry, null, 2));
                    setPreview(undefined);
                    setEntryError(undefined);
                  }}
                >
                  编辑
                </Button>
              ),
            },
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
        title="支持逐条编辑 JSON；单词名称、题目 ID、条数与顺序不可修改。已发布题库保存后会直接更新线上内容。"
      />
      <Modal
        title={`编辑第 ${(entryEdit?.index ?? 0) + 1} 条题目`}
        open={!!entryEdit}
        width={760}
        onCancel={() => {
          if (!busy) setEntryEdit(undefined);
        }}
        footer={
          <Space>
            <Button disabled={busy} onClick={() => setEntryEdit(undefined)}>
              取消
            </Button>
            <Button disabled={busy} onClick={previewEntry}>
              校验并预览
            </Button>
            <Button
              type="primary"
              loading={busy}
              disabled={!preview}
              onClick={saveEntry}
            >
              保存修改
            </Button>
          </Space>
        }
      >
        <ErrorNotice error={entryError} />
        <Input.TextArea
          aria-label="题目 JSON"
          rows={14}
          value={entryText}
          disabled={busy}
          onChange={(event) => {
            setEntryText(event.target.value);
            setPreview(undefined);
          }}
        />
        {preview && (
          <div className="upload-grid">
            <div>
              <h4>修改前</h4>
              <pre className="json-preview">
                {JSON.stringify(entryEdit?.original, null, 2)}
              </pre>
            </div>
            <div>
              <h4>修改后</h4>
              <pre className="json-preview">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
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
