<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Web UI 组件约定

本节适用于 `web/` 下新增或修改的界面。统一使用项目现有的 shadcn/ui 风格组件（基于 Radix UI），组件入口为 `src/components/ui/`。

- 按钮、输入框、选择器、弹窗、标签、进度条等交互控件，必须优先复用 `@/components/ui/*` 中的封装；已有对应组件时，不在业务页面直接使用原生 `<button>`、`<input>`、`<select>` 等重新实现。
- 下拉选择统一使用 `Select`、`SelectTrigger`、`SelectValue`、`SelectContent`、`SelectItem`；可搜索选择器复用现有 `Command` 等组件组合。
- 需要的控件尚未封装时，先基于现有 Radix UI / shadcn/ui 方式在 `src/components/ui/` 中补齐，再由业务组件引用。不要为同类控件引入另一套 UI 库，也不要在业务代码里重复封装交互行为。
- 业务页面通过组件的 `variant`、`size`、`className` 和组合方式调整样式，保留库组件提供的键盘交互、焦点管理、禁用状态及可访问性标签。
- 原生语义与布局元素（如 `label`、`form`、`section`、`ul`）正常使用；仅在平台限制或特殊输入行为确实无法由现有组件支持时使用原生交互控件，并在代码旁说明原因。
- 修改控件时检查桌面、小屏及弹窗内的显示、焦点和层级。无需为统一风格顺带重写本次任务未涉及的历史界面。
