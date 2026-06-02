# 项目详细思路、使用说明与公网部署

项目位置：

```text
E:\personal-profile-ai
```

本项目是一个“可互动的个人简介网站”：访客进入后可以浏览不同模块、给留言板留言，也可以向 AI 分身提问。网站内容主要由 `profile.config.json` 控制，代码负责把这些资料渲染成界面和问答体验。

## 一、编写思路

### 1. 为什么不是普通简历页

普通个人主页通常只是静态文字：姓名、经历、作品、联系方式。这个项目的目标是让访问者像“进入一个个人工作室”一样探索你：

- 首页左侧是动态星图和个人身份视觉，负责第一印象。
- 首页右侧是模块入口，访客可以按兴趣点进不同模块。
- 模块详情页有过渡动画，不是直接跳转，体验更像一个完整应用。
- AI 分身可以回答关于你的问题，让网站不只是展示，而是可以交流。
- 留言板让访客留下想法，并用浮动卡片呈现，增加互动感。

### 2. 为什么用 Node.js 后端

项目里有 `server.js`，所以它不是纯 HTML 静态网页。后端负责：

- 读取 `profile.config.json`。
- 提供 `/api/profile` 给前端读取公开资料。
- 提供 `/api/chat` 给 AI 问答使用。
- 提供 `/api/guestbook` 给留言板发布、读取、删除留言。
- 保护管理员密码和 DeepSeek API Key，不让它们暴露到浏览器代码里。

因此正式上线时，不能只用 GitHub Pages。它需要 Railway、Render、Vercel、VPS 等能运行 Node.js 的平台。

### 3. 资料和界面分离

个人内容尽量放在：

```text
profile.config.json
```

这样以后你改名字、简介、模块、作品、AI 语气时，不需要改很多代码。

代码文件主要负责：

- `public/index.html`：页面结构。
- `public/styles.css`：视觉样式、布局、动画。
- `public/app.js`：前端交互、模块切换、星图、留言板、AI 对话。
- `server.js`：后端 API、静态文件服务、安全限制、部署兼容。

### 4. AI 问答的逻辑

AI 问答分两层：

- 如果配置了 `DEEPSEEK_API_KEY`，网站会调用 DeepSeek API，根据你的资料回答。
- 如果没有配置 API Key，AI 分身会明确提示接口未配置，不使用本地假回答。

为了防止 AI 乱编，后端会把 `profile.config.json` 里的资料作为系统提示传给模型，并要求它只基于资料回答，不确定就说明不确定。

### 5. 留言板的逻辑

留言板有三个接口：

```text
GET    /api/guestbook
POST   /api/guestbook
DELETE /api/guestbook/:id
```

管理员删除留言需要密码。这个密码现在放在：

```text
.env
```

字段是：

```text
GUESTBOOK_ADMIN_PASSWORD=你的密码
```

不要把真实密码写进 `profile.config.json`，因为将来如果源代码公开，别人可能看到。

## 二、使用说明

### 1. 启动本地网站

打开 VS Code 终端，执行：

```powershell
Set-Location E:\personal-profile-ai
node server.js
```

浏览器打开：

```text
http://localhost:8787/?v=21
```

如果你用 npm：

```powershell
npm.cmd run dev
```

注意：PowerShell 有时会拦截 `npm`，所以优先用 `npm.cmd`。

### 2. 检查项目是否正常

每次大改之后执行：

```powershell
Set-Location E:\personal-profile-ai
npm.cmd run check
```

它会检查：

- `server.js` 语法。
- `public/app.js` 语法。
- `profile.config.json` 是否符合基本结构。

### 3. 改个人信息

打开：

```text
E:\personal-profile-ai\profile.config.json
```

常用字段：

- `name`：名字。
- `role`：身份标签。
- `location`：学校、城市或组织。
- `headline`：首页大字下面的描述。
- `summary`：整体简介。
- `availability`：右上角状态。
- `links`：邮箱、作品集、GitHub 等。
- `facts`：首页底部三个重点。
- `modules`：首页卡片和点进去后的详情。
- `knowledgeBase`：AI 问答资料库。
- `voice`：AI 的表达风格。
- `quickQuestions`：快捷问题按钮。

### 4. 加图片或视频

把图片或视频放到：

```text
E:\personal-profile-ai\public\media
```

然后在 `profile.config.json` 的某个模块里加：

```json
"media": [
  {
    "type": "image",
    "src": "/media/example.jpg",
    "alt": "作品截图",
    "caption": "这是一个作品截图"
  },
  {
    "type": "video",
    "src": "/media/demo.mp4",
    "caption": "项目演示视频"
  }
]
```

支持：

```text
jpg / png / webp / mp4 / webm
```

### 5. 改留言板管理员密码

打开：

```text
E:\personal-profile-ai\.env
```

修改：

```text
GUESTBOOK_ADMIN_PASSWORD=你的新密码
```

改完后重启服务器。

## 三、公网部署说明

### 方案 A：临时公网链接

适合先发给朋友看。优点是快，缺点是电脑关机或进程关闭后链接失效。

推荐用 Cloudflare Quick Tunnel：

```powershell
Set-Location E:\personal-profile-ai
node server.js
cloudflared tunnel --url http://127.0.0.1:8787
```

它会生成类似：

```text
https://xxxx.trycloudflare.com
```

当前我已经帮你启动的临时公网链接是：

```text
https://cornwall-observer-apollo-burst.trycloudflare.com/?v=21
```

备用方式是 localtunnel：

```powershell
Set-Location E:\personal-profile-ai
node server.js
npx.cmd --yes localtunnel --port 8787 --local-host 127.0.0.1
```

它会生成类似：

```text
https://xxxx.loca.lt
```

这个链接别人可以访问，但不是长期正式部署。

### 方案 B：Railway 正式部署

适合长期公开。Railway 会在云端运行 `server.js`。

当前项目已经准备好 Railway 部署所需文件：

- `package.json`
- `server.js`
- `.railwayignore`
- `.env.example`

Railway 正式部署通常需要：

- Railway 账号。
- 解锁 Trial 或 Hobby 计划。
- 一个能用于 CLI 的 Project Token，或能连接 GitHub 的正常 GitHub 账号。

部署命令理论上是：

```powershell
Set-Location E:\personal-profile-ai
railway.cmd link --project 4923a666-144a-45ea-9d92-9d44636f8d59 --environment production --service 01dc7551-6d79-428d-9222-0f491fc64f1e
railway.cmd up --detach
railway.cmd domain --service zonal-elegance --project 4923a666-144a-45ea-9d92-9d44636f8d59 --environment production
```

但前提是 Railway CLI 已经获得有效授权。如果命令提示 `Unauthorized`，说明 token 类型不对或账号权限不够。

Railway 云端需要配置环境变量：

```text
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=你的 DeepSeek Key，可选
GUESTBOOK_ADMIN_PASSWORD=你的留言删除密码
PUBLIC_SITE_URL=Railway 生成的公开网址
```

如果 Railway 支持持久磁盘，建议再配置：

```text
GUESTBOOK_PATH=/data/guestbook.json
```

否则重新部署后留言可能丢失。

### 方案 C：Render 正式部署

Render 也可以运行这个 Node.js 项目。项目里已经有：

```text
render.yaml
```

但 Render 通常需要连接 GitHub 仓库。你的 GitHub 账号之前出现过 flagged 提示，所以这条路可能需要先换一个正常 GitHub 账号，或者先处理 GitHub 账号状态。

## 四、当前部署状态

本地项目已经可以运行，检查命令通过。

Railway 这边目前卡点是：命令行还没有拿到可用的项目部署授权。网页登录和命令行授权不是一回事；如果 Railway CLI 继续提示 `Unauthorized`，就不能由命令行直接上传。

如果你愿意继续走 Railway，需要完成其中一种：

- 解锁 Railway Trial/Hobby，并创建 Project Token。
- 或者修复/更换 GitHub 账号，让 Railway 可以连接 GitHub 仓库。

完成后我可以继续帮你执行上传和生成公网域名。

## 五、上线前建议

- 把 `.env` 里的 `GUESTBOOK_ADMIN_PASSWORD` 换成强密码。
- 如果要真的 AI 回答，配置 `DEEPSEEK_API_KEY`。
- 如果要长期保存留言，给云端配置持久磁盘或数据库。
- 如果公开源代码，不要上传 `.env`、`data/guestbook.json`、token 脚本和日志文件。
- 每次上线前运行 `npm.cmd run check`。
