import { useEffect, useState } from "react";
import { Alert, Button, Space, Tag } from "antd";
import { ApiError, api } from "./api";

/** 查询切换或组件卸载时取消旧请求，避免迟到响应覆盖当前页面。 */
export function useResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    data?: T;
    loading: boolean;
    error?: Error;
  }>({ loading: true });
  useEffect(() => {
    if (!path) {
      setState({ loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ loading: true });
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ error, loading: false });
      });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload: () => setRevision((value) => value + 1) };
}

export function ErrorNotice({
  error,
  retry,
}: {
  error?: Error;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <Alert
      className="notice"
      type="error"
      showIcon
      title={error.message}
      description={
        error instanceof ApiError && error.details.length
          ? error.details.join("；")
          : undefined
      }
      action={
        retry && (
          <Button size="small" onClick={retry}>
            重试
          </Button>
        )
      }
    />
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Space>{action}</Space>
    </div>
  );
}

export const statusOptions = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" },
];
export const kindOptions = [
  { value: "word", label: "单词" },
  { value: "phrase", label: "短语" },
];
export function StatusTag({ status }: { status: string }) {
  return (
    <Tag
      color={
        status === "published"
          ? "green"
          : status === "draft"
            ? "gold"
            : "default"
      }
    >
      {statusOptions.find((option) => option.value === status)?.label || status}
    </Tag>
  );
}
