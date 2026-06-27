# 生产部署指南（Vercel + Railway）

架构：**Vercel 托管前端**，通过 `/api` 反向代理到 **Railway 后端**（同源 Cookie，无需改前端播放 URL）。

```text
浏览器 → https://podcast-bgm.vercel.app
           ├── /          → Vercel 静态资源（React）
           └── /api/*     → 代理 → https://xxx.up.railway.app/api/*
```

---

## 前置条件

- GitHub 仓库：`lij71116-cell/Podcast-BGM`（或 `-BGM-`）
- [Railway 账号](https://railway.app)（建议 Hobby $5/月，含 Volume 与稳定运行）
- [Vercel 账号](https://vercel.com)（前端已部署：**https://podcast-bgm.vercel.app**）

---

## 第一步：Railway 连接 GitHub 并部署后端

### 1. 创建项目

1. 打开 https://railway.app/new
2. 选择 **Deploy from GitHub repo**
3. 授权并选择 **Podcast-BGM** 仓库
4. 创建后进入该 Service 的 **Settings**

### 2. 构建配置

| 项 | 值 |
|----|-----|
| **Root Directory** | 留空（仓库根目录） |
| **Builder** | Dockerfile（由 `railway.json` 指定） |
| **Dockerfile Path** | `backend/Dockerfile` |

仓库根目录已有 `railway.json`，Railway 会自动识别。

### 3. 添加持久化 Volume（必做）

SQLite 与音频文件必须持久化：

1. Service → **Settings** → **Volumes** → **Add Volume**
2. **Mount Path** 填：`/data`
3. 保存（Hobby 计划默认 5GB，够用）

### 4. 环境变量

Service → **Variables** 添加：

| 变量 | 值 |
|------|-----|
| `HOST` | `0.0.0.0` |
| `DEBUG` | `false` |
| `DATABASE_PATH` | `/data/podcast_flow.db` |
| `STORAGE_ROOT` | `/data/storage` |
| `SESSION_SECRET` | 随机字符串（如 `openssl rand -hex 32` 生成） |
| `CORS_ORIGINS` | `https://podcast-bgm.vercel.app` |
| `FFMPEG_PATH` | `ffmpeg` |
| `FFPROBE_PATH` | `ffprobe` |

`PORT` 由 Railway 自动注入，无需手动设置。

### 5. 生成公网域名

1. Service → **Settings** → **Networking**
2. 点击 **Generate Domain**
3. 得到类似 `podcast-flow-api-production-xxxx.up.railway.app` 的地址
4. 验证：

```bash
curl https://你的域名.up.railway.app/health
```

### 6. 资源建议

| 项 | 建议 |
|----|------|
| 计划 | Hobby（$5/月） |
| 内存 | ≥ 512MB（FFmpeg 混音） |
| Volume | 5GB（Hobby 默认） |

免费 $1/月额度仅够极小服务，**FFmpeg 混音容易 OOM 或停服**，不推荐生产使用。

---

## 第二步：更新 Vercel API 代理

编辑 `frontend/vercel.json`，将 Railway 域名写入 `destination`：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://你的域名.up.railway.app/api/:path*"
    }
  ]
}
```

提交 push 后重新部署 Vercel：

```bash
cd frontend && vercel deploy --prod --yes
```

或在 Vercel 控制台触发 Redeploy。

---

## 第三步：Vercel 前端（若尚未配置）

| 项 | 值 |
|----|-----|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

环境变量：

| 变量 | 值 |
|------|-----|
| `VITE_USE_MOCK` | `false` |
| `VITE_API_BASE_URL` | `/api` |

当前生产地址：**https://podcast-bgm.vercel.app**

---

## 全链路验证

1. 打开 https://podcast-bgm.vercel.app
2. 解析小宇宙单集 → 上传 BGM → 生成组合音频
3. 音频库播放正常
4. DevTools → Network：`/api/*` 走 Vercel 域名；Cookie `podcast_flow_session` 已设置

---

## 环境变量参考

### Railway

| 变量 | 说明 |
|------|------|
| `HOST` | `0.0.0.0` |
| `PORT` | Railway 自动注入 |
| `DEBUG` | 生产 `false`（启用 Secure Cookie） |
| `DATABASE_PATH` | Volume 内 SQLite：`/data/podcast_flow.db` |
| `STORAGE_ROOT` | Volume 内存储：`/data/storage` |
| `SESSION_SECRET` | Session 签名密钥 |
| `CORS_ORIGINS` | Vercel 前端域名（直连 Railway 时生效） |
| `FFMPEG_PATH` / `FFPROBE_PATH` | Docker 镜像内 `ffmpeg` / `ffprobe` |

### Vercel

| 变量 | 说明 |
|------|-----|
| `VITE_USE_MOCK` | 必须 `false` |
| `VITE_API_BASE_URL` | 必须 `/api` |

---

## 常见问题

| 现象 | 处理 |
|------|------|
| API 502 | 确认 Railway 服务 Running；检查 `vercel.json` 域名是否正确 |
| 合成失败 / OOM | 将 Railway 内存调到 512MB–1GB |
| 数据丢失 | 确认 Volume 已挂载到 `/data`，且环境变量路径一致 |
| Cookie 未写入 | `DEBUG=false`；Vercel 必须为 HTTPS |
| CORS 错误 | 正常应只访问 Vercel `/api`；若直连 Railway 需设 `CORS_ORIGINS` |
| 国内访问慢 | Railway 节点在海外，属正常；前端 Vercel 通常较快 |

---

## 本地与生产差异

| 项 | 本地 | 生产 |
|----|------|------|
| 前端 API | Vite proxy → localhost:8100 | Vercel rewrite → Railway |
| 数据库 | `backend/data/*.db` | Railway Volume `/data/` |
| FFmpeg | 系统安装 | Docker 镜像内置 |
| 配置来源 | `backend/.env` | Railway Variables |

本地开发不受影响，仍按 `docs/startup.md` 启动。
