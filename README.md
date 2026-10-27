# Sentence Quest / SentLeap

同一个仓库中的 Web 与微信小程序版本。

```text
sentence-quest/
├── web/                 # 原有 Next.js 应用、API、完整词库、测试和环境配置
├── miniprogram/         # 原生微信小程序，可直接导入微信开发者工具
├── scripts/             # 跨端题库同步、小程序测试
└── package.json         # 根目录快捷命令
```

## Web

```bash
pnpm --dir web install
npm run dev
```

根目录的 `dev`、`build`、`start`、`typecheck` 和原有测试命令会转发到 `web/`。也可以进入 `web/` 执行原来的命令。Web 的环境变量现在放在 `web/.env.local`，部署平台的项目根目录应改为 `web`。依赖和 lockfile 独立保留在 `web/`，根目录不安装应用依赖。

完整 Web 说明见 [web/README.md](web/README.md)。原有页面、API 路径、浏览器进度存储键不变；使用相同站点地址即可继续读取原来的浏览器进度。

## 微信小程序

1. 在微信开发者工具中导入 `miniprogram/`，使用自己的 AppID。仓库默认 `touristappid` 用于本地体验，不是发布 AppID。
2. 无需 npm 构建：内置精选短语、句子闯关和完整 CET-4 词库，可以直接练习。
3. 要使用其他在线词库和发音，在 `miniprogram/config.js` 填写已部署 Web 的 HTTPS 域名，并按 [小程序说明](miniprogram/README.md) 配置服务器域名。

## 同步与检查

```bash
npm run sync:miniprogram  # 从 web 的权威源生成内置题库、目录和校验 / XP 逻辑
npm run test:miniprogram  # 小程序流程、存储、数据、配置与包体积检查
npm run check            # Web 全部既有检查 + 小程序检查
npm run build            # Web 生产构建
```

小程序的 `data/*.js`、`utils/validator.js`、`utils/practice-xp.js` 是已提交的生成文件。修改 Web 数据或共享规则后执行同步命令，避免两端手工维护不同副本。同步需要先安装 Web 开发依赖。

两端目前各自保存进度，没有账号或跨设备同步。小程序目录未包含 Web 的 68 MB 完整静态词库，在线题库从 Web 按需获取。

题库来源与许可见 [TypeWords 说明](web/docs/third-party/TypeWords.md)。
