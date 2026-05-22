# 长期维护说明

这个项目的主要源代码都在 `E:\personal-profile-ai`。

## 常用命令

```powershell
Set-Location E:\personal-profile-ai
node server.js
```

检查配置和代码语法：

```powershell
npm.cmd run check
```

浏览器打开：

```text
http://localhost:8787/?v=21
```

## 改个人信息

主要改这个文件：

```text
E:\personal-profile-ai\profile.config.json
```

常改字段：

- `name`：你的名字
- `role`：身份/方向
- `location`：学校、城市或组织
- `headline`：首页大标题下面那句话
- `summary`：网站和个人简介摘要
- `availability`：右上角状态
- `links`：邮箱、作品集、GitHub 等链接
- `facts`：首页底部三个重点信息
- `modules`：主界面卡片和点进去后的模块内容
- `knowledgeBase`：AI 问答的资料库
- `voice`：AI 回答时模仿你的语气
- `quickQuestions`：AI 问答里的快捷问题

## 在模块里加图片或视频

把图片或视频放到：

```text
E:\personal-profile-ai\public\media
```

然后在某个 `modules` 里加：

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

支持 `jpg`、`png`、`webp`、`mp4`、`webm`。

## 留言板管理员密码

管理员删除留言的密码现在放在：

```text
E:\personal-profile-ai\.env
```

字段是：

```text
GUESTBOOK_ADMIN_PASSWORD=change-me-8787
```

正式公开前建议换成你自己的强密码。

## 云端部署变量

部署到 Railway / Render 等平台时，建议配置这些环境变量：

```text
OPENAI_API_KEY=你的 OpenAI Key
OPENAI_MODEL=gpt-4.1-mini
GUESTBOOK_ADMIN_PASSWORD=你的留言板删除密码
PUBLIC_SITE_URL=你的公开网址
```

如果平台支持持久磁盘，把留言保存路径设置为挂载磁盘路径，例如：

```text
GUESTBOOK_PATH=/data/guestbook.json
```

如果没有持久磁盘，重新部署或重启后留言可能丢失。

## 不要上传的文件

这些文件只应该留在本机：

- `.env`
- `data/guestbook.json`
- `railway-*-login.ps1`
- `.edge-profile`
- `.edge-check`
- `*.log`

它们已经写进 `.gitignore` 和 `.railwayignore`。
