<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目注释规范

- 后续新增或修改页面时，在页面代码文件开头用中文概述页面用途、主要功能和数据来源；小程序 WXML 页面文件开头简述页面用途。
- 后续新增或修改的函数、页面组件、辅助函数、生命周期函数和事件处理函数都需要中文注释，说明其作用；涉及参数、返回值、业务限制或副作用时补充必要说明。
- 注释应与实现保持一致，逻辑变化时同步更新；无需为每一行显而易见的代码重复添加注释。
- 以上规范适用于整个项目的后续开发；已有代码在修改时逐步补充，无需为遵循此规范批量改写无关文件。

## 代码格式规范

- 整个项目后续新增或修改的代码都必须格式化，沿用所在目录已有的格式化工具和配置；没有工具配置时，按照项目现有风格手动整理。
- 使用一致的缩进和空行区分逻辑段落；每行原则上只写一条语句，函数体、条件分支和循环使用清晰的多行结构。
- 较长的条件、参数、对象和类型定义应合理换行，避免将多个步骤压缩在一行，保证代码易于阅读和维护。
- 提交前检查本次修改的格式和注释；已有文件逐步随修改整理，无需批量格式化无关代码或生成文件。
