# SentLeap 微信小程序

原生 JavaScript + WXML + WXSS，无第三方运行时依赖。导入本目录即可预览，不需要构建 npm。

## 页面

- 学习：继续上次练习、单词 / 短语筛选、搜索题库、掌握进度。
- 练习：中文提示、连续逐词输入、即时错误提示、字母提示、跳题、完成解析、XP。
- 错题：自动收录拼错、提示和跳过的题目；独立正确完成复习后移除。
- 我的：累计 XP、掌握数、28 天学习记录、英美音、提示开关。

练习页不显示 TabBar，采用微信原生导航栏以避开胶囊。输入区固定在可用区域底部，通过 `bindkeyboardheightchange` 跟随键盘高度，`adjust-position=false` 避免重复上推；题目区独立滚动。使用系统键盘，请切换英文输入。连续答对单词时保留同一个 input，整题完成时收起键盘。长单词在 input 内滚动，句子词组自动换行。

## 导入与联网

1. 微信开发者工具 → 导入项目 → 选择 `miniprogram/`。
2. 本地体验可使用默认测试配置；真机预览 / 上传请在 `project.config.json` 使用你自己的小程序 AppID。
3. 离线可使用 20 条精选练习、句子闯关以及完整四级词库。在线目录来自 Web，其他词库按需加载并保留最近一份内存缓存。
4. 部署 `../web`，在 `config.js` 填写 `apiBaseUrl: 'https://你的域名'`，不要填 API 路径，不要填写密钥。
5. 微信公众平台服务器域名中配置该域名的 **request** 和 **downloadFile** 合法域名（分别用于题库与音频）。保持开发工具 `urlCheck` 开启；不需要配置 web-view 业务域名。
6. 服务需要提供 `/dictionaries/words/*.json` 和 `/api/pronunciation?word=...&type=1`，均复用现有 Web 实现。口音 `1` 为英音，`2` 为美音。无服务域名时会明确提示，内置练习不受影响。

发音能力依赖现有 Web 服务和上游音频可用性。未配置任何生产地址或 AppSecret。尚未提供登录、云同步、意见反馈和网页端完整分类 / 分组管理界面。

## 进度与故障处理

存储键为 `sentleap:miniprogram:v1`，与 Web 数据独立。题库位置、已完成题目、错题、设置和每日记录保存在当前设备。首次掌握获得 10 XP，首次无错误且未使用提示获得额外 5 XP；重复完成不重复发放 XP。离开未完成题目后，从该题开头继续。

本地存储读取失败时保留旧记录，不覆盖损坏数据，并提示本次仅临时保存。写入失败会提示检查空间，内存中仍能继续练习；重新打开不保证保留未成功写入的数据。

## 验证

在仓库根目录执行 `npm run test:miniprogram`。这些检查使用 Node 模拟微信 API，不能替代开发工具编译和真机测试。

真机验收重点：

- 320 / 375 / 430px 宽度、长题目、长单词、键盘弹出和收起、横竖屏 / 安全区。
- iOS 和 Android 英文键盘连续输入，拼对切词时保持键盘，完成时收起键盘。
- 提示、错误、跳过进入错题；无提示正确复习后移除；返回再进入恢复题目位置。
- 断网下内置题库可练，在线题库有错误反馈和重试；真实 HTTPS 域名下发音可用。
- 关闭重开后进度保留，存储异常显示提示。

平台参考：[input](https://developers.weixin.qq.com/miniprogram/dev/component/input.html)、[网络能力](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)、[项目配置](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)。

题库与授权说明见 [Web 的来源记录](../web/docs/third-party/TypeWords.md)，小程序内置数据与之使用同一来源。
