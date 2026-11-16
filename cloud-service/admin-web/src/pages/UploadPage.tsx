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

export default function UploadPage() {
  const [form] = Form.useForm();
  const kind = Form.useWatch("kind", form) || "word";
  const [file, setFile] = useState<File>();
  const [source, setSource] = useState("");
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<Error>();
  const mutation = useApiMutation<{ dictionary: Dictionary }>("/dictionaries");
  const busy = mutation.isPending;
  const [reading, setReading] = useState(false);
  const fileRevision = useRef(0);
  const navigate = useNavigate();
  const { message } = App.useApp();
  useEffect(() => {
    setEntries([]);
    setError(undefined);
    if (!source) return;
    try {
      setEntries(parseEntries(source, kind));
    } catch (error) {
      setError(error as Error);
    }
  }, [source, kind]);
  async function choose(next: File) {
    const revision = ++fileRevision.current;
    setFile(undefined);
    setSource("");
    setEntries([]);
    setError(undefined);
    setReading(true);
    try {
      if (!/\.json$/i.test(next.name)) throw new Error("请选择 .json 文件");
      if (next.size > 5 * 1024 * 1024 - 16384)
        throw new Error("文件过大，请使用小于 5 MiB 的题库文件");
      const text = await next.text();
      if (revision !== fileRevision.current) return false;
      setFile(next);
      setSource(text);
    } catch (error) {
      if (revision === fileRevision.current) setError(error as Error);
    } finally {
      if (revision === fileRevision.current) setReading(false);
    }
    return false;
  }
  async function submit(values: Record<string, string>) {
    if (!file || !entries.length) {
      setError(new Error("请先选择并检查题库 JSON 文件"));
      return;
    }
    setError(undefined);
    const body = new FormData();
    for (const [key, value] of Object.entries(values))
      if (value?.trim()) body.append(key, value.trim());
    body.append("status", "draft");
    body.append("file", file);
    try {
      const result = await mutation.mutateAsync({
        path: "/upload-dictionary",
        options: { method: "POST", body },
      });
      message.success("题库草稿已创建，请检查内容后发布");
      navigate(`/dictionaries/${encodeURIComponent(result.dictionary.id)}`);
    } catch (error) {
      setError(error as Error);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="NEW DICTIONARY"
        title="新建题库"
        description="上传一份 JSON，预览内容后保存为草稿。发布前有充分的检查空间。"
      />
      <div className="upload-grid">
        <Card className="panel" title="01 / 基础资料">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ kind: "word" }}
            onFinish={submit}
            disabled={busy}
            requiredMark={false}
          >
            <Form.Item
              name="id"
              label="题库 ID"
              extra="创建后不可修改，请保持 ID 与既有学习数据一致。"
              rules={[
                { required: true },
                {
                  pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/,
                  message: "使用字母、数字、点、下划线或连字符，最多 80 位",
                },
              ]}
            >
              <Input placeholder="例如 cet4-essential" />
            </Form.Item>
            <Form.Item
              name="label"
              label="题库名称"
              rules={[{ required: true, whitespace: true, max: 100 }]}
            >
              <Input placeholder="例如 四级核心词汇" />
            </Form.Item>
            <Form.Item
              name="kind"
              label="题库类型"
              rules={[{ required: true }]}
            >
              <Select options={kindOptions} />
            </Form.Item>
            <Form.Item
              name="category"
              label="分类"
              rules={[{ max: 100, whitespace: true }]}
            >
              <Input
                placeholder={
                  kind === "word" ? "默认：单词练习" : "默认：短语练习"
                }
              />
            </Form.Item>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={busy}
              disabled={!entries.length || reading}
              block
            >
              保存为草稿
            </Button>
          </Form>
        </Card>
        <Card className="panel" title="02 / 上传与预览">
          <Upload.Dragger
            accept=".json,application/json"
            maxCount={1}
            showUploadList={false}
            beforeUpload={choose}
            disabled={busy || reading}
          >
            <CloudUploadOutlined className="upload-icon" />
            <h3>
              {reading
                ? "正在读取文件…"
                : file?.name || "点击或拖拽 JSON 文件到这里"}
            </h3>
            <p>原始题目数组 · 最大 5 MiB（含表单）</p>
          </Upload.Dragger>
          <ErrorNotice error={error} />
          {entries.length > 0 && (
            <>
              <div className="preview-summary">
                <strong className="entry-count">
                  已校验 {entries.length} 条
                </strong>
                <span>预览前 5 条，原始顺序保持不变</span>
              </div>
              <pre className="json-preview">
                {JSON.stringify(entries.slice(0, 5), null, 2)}
              </pre>
            </>
          )}
          {!source && (
            <div className="format-guide">
              <strong>文件结构示例</strong>
              <pre>
                {kind === "word"
                  ? '[\n  { "name": "hello", "trans": ["int. 你好"] }\n]'
                  : '[\n  { "id": "p1", "zh": "早上好",\n    "english": "Good morning",\n    "words": ["Good", "morning"] }\n]'}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
