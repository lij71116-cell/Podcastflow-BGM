# 生产部署指南（Vercel + Railway）

架构：**Vercel 托管前端**，通过 `/api` 反向代理到 **Railway 后端**（同源 Cookie，JWT 鉴权）。

```text
浏览器 → https://podcast-bgm.vercel.app
           ├── /          → Vercel 静态资源（React + PWA）
           └── /api/*     → 代理 → https://podcast-bgm-production.up.railway.app/api/*
```

---

## 前置条件

- GitHub 仓库：[lij71116-cell/Podcastflow-BGM](https://github.com/lij71116-cell/Podcastflow-BGM)
- [Railway 账号](https://railway.app)（建议 Hobby $5/月，含 Volume 与稳定运行）
- [Vercel 账号](https://vercel.com)（前端：**https://podcast-bgm.vercel.app**）

---

## 第一步：Railway 部署后端

### 1. 连接 GitHub

1. 打开 https://railway.app/new
2. 选择 **Deploy from GitHub repo**
3. 选择 **Podcastflow-BGM** 仓库
4. 进入 Service → **Settings**

### 2. 构建配置

| 项 | 值 |
|----|-----|
| **Root Directory** | 留空（仓库根目录） |
| **Builder** | Dockerfile（`railway.json`） |
| **Dockerfile Path** | `backend/Dockerfile` |

### 3. 持久化 Volume（必做 · 否则每次部署丢账号与音频）

> **重要**：Railway 容器文件系统会在重新部署时被清空。未挂载 Volume 时，SQLite 与音频文件写入容器临时目录，表现为「旧账号无法登录、资产消失、只能重新注册」。

1. Service → **Settings** → **Volumes** → **Add Volume**
2. **Mount Path**：`/data`（必须与下方环境变量前缀一致）
3. 确认 Volume 已绑定到**当前** Service（重建 Service 后需重新挂载）

部署后验证（`persistence_ok` 必须为 `true`）：

```bash
curl -s https://podcast-bgm-production.up.railway.app/health | jq '.data.persistence'
```

期望输出示例：

```json
{
  "database_path": "/data/podcast_flow.db",
  "storage_root": "/data/storage",
  "volume_mounted": true,
  "persistence_ok": true,
  "user_count": 1,
  "mixed_audio_count": 3
}
```

若 `volume_mounted: false` 或 `persistence_ok: false`，**不要继续验收**，先修复 Volume 再部署。

### 4. 环境变量（V2 · JWT）

Service → **Variables**：

| 变量 | 值 |
|------|------|
| `HOST` | `0.0.0.0` |
| `DEBUG` | `false` |
| `DATABASE_PATH` | `/data/podcast_flow.db` |
| `STORAGE_ROOT` | `/data/storage` |
| `JWT_SECRET` | 随机字符串（`openssl rand -hex 32`） |
| `JWT_EXPIRE_HOURS` | `168` |
| `JWT_COOKIE_NAME` | `podcast_flow_token` |
| `CORS_ORIGINS` | `https://podcast-bgm.vercel.app` |
| `FFMPEG_PATH` | `ffmpeg` |
| `FFPROBE_PATH` | `ffprobe` |

`PORT` 由 Railway 自动注入。`DEBUG=false` 时 JWT Cookie 为 Secure。

> **V2 迁移**：若 Railway 仍保留 V1 的 `SESSION_SECRET`，可删除；生产鉴权以 `JWT_SECRET` 为准。

### 5. 公网域名

1. Service → **Settings** → **Networking** → **Generate Domain**
2. 当前生产域名示例：`podcast-bgm-production.up.railway.app`
3. 验证：

```bash
curl https://podcast-bgm-production.up.railway.app/health
```

### 6. 资源建议

| 项 | 建议 |
|----|------|
| 计划 | Hobby（$5/月） |
| 内存 | ≥ 512MB（FFmpeg 混音） |
| Volume | 5GB |

---

## 第二步：Vercel API 代理

`frontend/vercel.json` 中 `destination` 指向 Railway 域名：

```json
{
  "source": "/api/:path*",
  "destination": "https://podcast-bgm-production.up.railway.app/api/:path*"
}
```

修改 Railway 域名后需 commit push 并重新部署 Vercel。

```bash
cd frontend && vercel deploy --prod --yes
```

---

## 第三步：Vercel 前端

| 项 | 值 |
|----|-----|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

环境变量：

| 变量 | 值 |
|------|------|
| `VITE_USE_MOCK` | `false` |
| `VITE_API_BASE_URL` | `/api` |

生产地址：**https://podcast-bgm.vercel.app**

PWA（manifest / SW）随 `npm run build` 自动产出；无需额外 Vercel 配置。

---

## 全链路验证（V2）

1. 打开 https://podcast-bgm.vercel.app
2. **注册 / 登录**（未登录不可访问创建页）
3. 解析小宇宙单集 → BGM → 生成组合音频
4. 音频库播放、续播、批量删除、详情重新生成
5. DevTools → Network：`/api/*` 走 Vercel 同源；Cookie `podcast_flow_token` 已设置
6. （可选）移动视口「添加到主屏幕」→ 后台播放

---

## 环境变量参考

### Railway

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（**必填**） |
| `JWT_EXPIRE_HOURS` | Token 有效期（小时） |
| `JWT_COOKIE_NAME` | 默认 `podcast_flow_token` |
| `DATABASE_PATH` | Volume 内 SQLite |
| `STORAGE_ROOT` | Volume 内 `bgm/`、`mixed/`、`covers/` |
| `CORS_ORIGINS` | Vercel 前端域名 |
| `DEBUG` | 生产 `false` |

### Vercel

| 变量 | 说明 |
|------|------|
| `VITE_USE_MOCK` | 必须 `false` |
| `VITE_API_BASE_URL` | 必须 `/api` |

---

## 常见问题

| 现象 | 处理 |
|------|------|
| API 502 | Railway 服务是否 Running；`vercel.json` 域名是否正确 |
| 401 未登录 | 先注册登录；检查 `JWT_SECRET` 是否已设置 |
| 合成失败 / OOM | Railway 内存调至 512MB–1GB |
| 数据丢失 / 部署后账号资产清空 | **Volume 未挂载 `/data`** 或 `DATABASE_PATH`/`STORAGE_ROOT` 不在 `/data` 下；查 `/health` → `persistence` 字段 |
| 旧账号无法登录但能重新注册 | 多为数据库被重置（同上）；若仅 Cookie 失效应能原账号密码登录，不应需要新注册 |
| Cookie 未写入 | `DEBUG=false`；Vercel 必须 HTTPS |
| **登录/注册 404** | Railway 仍为 **V1 旧镜像**（无 `/api/auth/*`）。在 Railway 重新部署 `Podcastflow-BGM` 最新 `main`，并设置 `JWT_SECRET`；部署后 `curl …/health` 应含 `"api_version":"2.0"` |
| PWA 不生效 | 确认 Vercel 已部署最新 build；清除旧 SW |

---

## 本地与生产差异

| 项 | 本地 | 生产 |
|----|------|------|
| 前端 API | Vite proxy → localhost:8100 | Vercel rewrite → Railway |
| 鉴权 | JWT Cookie（`.env` 配 `JWT_SECRET`） | Railway Variables |
| 数据库 | `backend/data/*.db` | Railway Volume `/data/` |
| FFmpeg | 系统安装 | Docker 镜像内置 |

本地开发见 [`docs/startup.md`](startup.md)。
