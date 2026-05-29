# 个人简介 AI 问答网站

这是一个零依赖的个人公开网站项目：左侧是高级感个人简介和动态视觉，右侧是可对话的 AI 分身。访客可以提问，网站会基于 `profile.config.json` 中的个人资料和语气样本回答。

## 快速运行

```powershell
node server.js
```

打开：

```text
http://localhost:8787
```

## 在 VSCode 中使用

1. 用 VSCode 打开这个文件夹。
2. 编辑 `profile.config.json`，把名字、经历、项目、联系方式和语气改成你自己的。
3. 如果要接入真实 AI，复制 `.env.example` 为 `.env`，填入 `OPENAI_API_KEY`。
4. 在 VSCode 里运行任务 `Start personal profile site`，或直接在终端执行 `node server.js`。

## 让回答更像你

重点改这几块：

- `knowledgeBase`: 放访客最可能问的问题、关键词和你的标准回答。
- `voice.principles`: 放你的表达原则。
- `voice.sampleLines`: 放几句你平时真的会说的话。
- `voice.avoid`: 放你不想出现的语气，比如营销腔、鸡汤、过度正式。

资料越具体，AI 越不容易编造，也越像本人。

## 修改主界面信息

所有个人内容优先改 `profile.config.json`：

- 顶部和首屏：改 `name`、`role`、`location`、`headline`、`summary`、`availability`。
- 联系方式：改 `links`。
- 首页底部重点信息：改 `facts`。
- 主界面模块卡片和点进去后的详情：改 `modules`。
- AI 问答资料库：改 `knowledgeBase`。
- AI 回答语气：改 `voice`。
- 快速问题按钮：改 `quickQuestions`。

`modules` 里的每个模块都可以改这些字段：

- `id`: 模块唯一标识，建议用英文，比如 `projects`。
- `title`: 卡片和详情页标题。
- `summary`: 卡片摘要和详情页开头说明。
- `accent`: 模块强调色。
- `chips`: 标签。
- `stats`: 数据格。
- `sections`: 详情内容块，后续把占位文字替换成你的真实内容即可。

## 部署

这个项目需要服务端保护 API Key，所以推荐部署到支持 Node.js 的平台，例如 Render、Railway、Fly.io、Vercel Serverless 或自己的 VPS。

部署时设置环境变量：

```text
OPENAI_API_KEY=你的 key
OPENAI_MODEL=gpt-4.1-mini
PORT=8787
```

如果不设置 `OPENAI_API_KEY`，网站仍然可以运行，会使用本地风格兜底回答。

## 留言持久化

留言接口会优先使用 Redis/Upstash 云端存储。只要公网部署环境里保留下面这些变量，重新上传代码、重新部署 Render/Railway 后，访客留言也会继续保留。

```text
REDIS_URL=https://你的-upstash-rest-url
REDIS_TOKEN=你的-upstash-rest-token
GUESTBOOK_REDIS_KEY=guestbook:messages
GUESTBOOK_ADMIN_PASSWORD=你的删除密码
```

如果没有配置 Redis，留言会写入 `data/guestbook.json`。本地运行时这样没问题，但很多免费公网平台在重新部署后会清空实例文件，所以正式公网建议一定配置 Redis。部署后可以打开 `/api/health`，看到 `guestbookPersistentAcrossDeploys: true` 就表示已经是跨部署保留。
