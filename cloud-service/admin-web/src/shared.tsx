import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth/AuthProvider";
import { resourceKey } from "./query";
import { Alert, Button, Space, Tag } from "antd";
import { ApiError, api } from "./api";

/** React Query 按完整路径缓存分页结果，并在切换查询时取消旧请求。 */
export function useResource<T>(path: string | null) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: resourceKey(path || ""),
    queryFn: ({ signal }) => api<T>(path!, { signal }),
    enabled: !!path && !!user,
  });
  return {
    data: query.data,
    loading: query.isFetching,
    error: query.error || undefined,
    reload: () => {
      if (path && user) void query.refetch();
    },
  };
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
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
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
