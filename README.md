# Podcast Flow

Web 端播客 BGM 增强工具：输入小宇宙公开单集链接，叠加 BGM 并配置混音参数，由后端 FFmpeg 合成完整组合音频，保存在个人音频库中在线播放。

**V2.0 · 已收官（2026-06-29）**

> 产品边界：仅提供 Stream 内联播放，**全站不提供下载**；V2 起需账号登录（JWT Cookie），同一账号多端共享音频库；支持 PWA 安装与移动端后台播放。

在线演示（若已部署）：https://podcast-bgm.vercel.app

---

## 功能概览

| 模块 | 能力 |
|------|------|
| 账号 | 注册 / 登录 / 登出 / 修改密码；未登录无法访问核心页 |
| 播客解析 | 小宇宙公开单集链接 → 封面、标题、时长、摘要 |
| BGM | 本地上传 / 公开音频链接 / 汽水音乐分享链接（含封面解析） |
| 混音配置 | 播客与 BGM 独立音量、倍速；BGM 循环；**淡入淡出**；双轨试听 |
| 合成 | 后端 FFmpeg 异步混音，任务进度轮询 |
| 音频库 | 列表、标题搜索、创建日期筛选、分页、**批量删除** |
| 播放 | 全局底部播放器跨页连续播放；详情页内嵌播放器 |
| 续播 | global / inline 播放进度分别记忆与恢复 |
| 详情 | 播客 / BGM / 混音参数展示；**同 ID 重新生成** |
| PWA | manifest + Service Worker；移动视口安装引导 |
| 后台播放 | Media Session + 锁屏控件；切 App / 息屏续播（PWA 真机） |

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 前端 | React 19 · TypeScript · Vite · Ant Design · Zustand · React Router |
| 后端 | Python 3.11+ · FastAPI · PyCore · SQLAlchemy · SQLite |
| 音频 | FFmpeg / ffprobe |
| 存储 | 本地文件系统（`backend/storage/`） |
| 认证 | JWT HttpOnly Cookie |
| PWA | `manifest.webmanifest` · 轻量 SW 静态缓存 |

---

## 项目结构

```text
podcast-flow/
├── frontend/              # React 前端（Vite）
│   ├── public/            # PWA manifest、SW、icons
│   └── src/
│       ├── pages/         # Auth / Create / Library / Detail
│       ├── components/    # GlobalPlayerBar、PwaInstallBar 等
│       ├── services/      # axios API 封装
│       └── hooks/         # 播放进度、Media Session 等
├── backend/               # FastAPI 后端
│   ├── src/               # routes / services / repositories
│   ├── data/              # SQLite 数据库
│   ├── storage/           # BGM 与合成音频、封面
│   └── tests/             # pytest（86 cases）
├── docs/                  # PRD、API 契约、Plan、startup、deploy、原型
├── pycore/                # 共享 Python 核心库
├── .sdd/                  # SDD 任务、测试报告、项目元数据
└── .venv/                 # Python 虚拟环境（项目根目录）
```

---

## 快速开始

### 环境要求

- Python 3.11+（当前开发环境 3.14.5）
- Node.js 18+
- FFmpeg + ffprobe（`ffmpeg -version` 可执行）
- 可访问小宇宙公开单集页、汽水音乐分享页（BGM 链接模式）

### 1. 安装依赖

```bash
cd Projects_Repo/podcast-flow

python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

cd frontend && npm install && cd ..
```

### 2. 配置

复制 `backend/.env.example` 为 `backend/.env`，至少配置端口、CORS、JWT 与存储路径。

前端 `frontend/.env`（**推荐真实 API 模式**）：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
VITE_BACKEND_PROXY_TARGET=http://localhost:8100
```

### 3. 启动（日常开发）

```bash
# 终端 1 — 后端（8100）
cd backend
PYTHONPATH=..:. ../.venv/bin/python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8100

# 终端 2 — 前端（5201）
cd frontend
npm run dev -- --host 127.0.0.1 --port 5201
```

浏览器访问：**http://127.0.0.1:5201** → 注册 / 登录后开始使用。

### 4. PWA 预览（可选）

PWA、Service Worker 与后台播放仅在 production build 下生效：

```bash
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 5176
```

真机验收：`npm run preview -- --host 0.0.0.0 --port 5176`，同一局域网访问 `http://<本机IP>:5176`。

更完整的启动说明、验收清单、FAQ 与端口对照见 **[`docs/startup.md`](docs/startup.md)**。

---

## 页面路由

| 路由 | 页面 | 登录 |
|------|------|------|
| `/auth` | 注册 / 登录 | 公开 |
| `/` | 创建组合音频（3 步事件轴） | 需登录 |
| `/library` | 我的组合音频库 | 需登录 |
| `/detail/:id` | 组合音频详情 | 需登录 |

---

## 开发与测试

```bash
# 后端
cd backend
../.venv/bin/ruff check src tests
../.venv/bin/mypy src
PYTHONPATH=..:. ../.venv/bin/python -m pytest tests

# 前端
cd frontend
npm run type-check
npm run lint
npm run build
```

V2 收官回归（T-030）：pytest **86 passed**；ruff / mypy / type-check / lint / build 通过。报告见 [`.sdd/test-reports/T-030.md`](.sdd/test-reports/T-030.md)。

---

## 生产部署

推荐架构：前端 **Vercel**，后端 **Railway**（Docker + FFmpeg + Volume），Vercel 将 `/api/*` 代理到 Railway，浏览器同源访问 JWT Cookie。

完整步骤见 **[`docs/deploy.md`](docs/deploy.md)**，概要：

1. **Railway**：GitHub 连仓库 → 挂载 Volume `/data` → 配置 `JWT_SECRET`、`DATABASE_PATH`、`STORAGE_ROOT` 等 → Generate Domain
2. **Vercel**：Root Directory = `frontend`；`VITE_USE_MOCK=false`、`VITE_API_BASE_URL=/api`
3. 更新 `frontend/vercel.json` 中的 Railway 域名并重新部署

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [`docs/startup.md`](docs/startup.md) | 启动命令、E2E 验收、PWA 后台播放、FAQ |
| [`docs/deploy.md`](docs/deploy.md) | Vercel + Railway 生产部署 |
| [`docs/PRD.md`](docs/PRD.md) | 产品需求定稿 |
| [`docs/api-contracts.md`](docs/api-contracts.md) | API 契约（唯一权威源） |
| [`docs/Plan.md`](docs/Plan.md) | 开发计划与 V2 里程碑 |
| [`docs/prototypes/v2/`](docs/prototypes/v2/) | V2 高保真 HTML 原型 |

---

## 主要 API（摘要）

完整定义见 [`docs/api-contracts.md`](docs/api-contracts.md)。以下均需登录（除 auth 公开路由）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户 |
| POST | `/api/auth/change-password` | 修改密码 |
| POST | `/api/podcasts/parse` | 解析小宇宙单集 |
| POST | `/api/bgm/upload` | 上传 BGM |
| POST | `/api/bgm/validate-url` | 校验 BGM 链接 |
| POST | `/api/bgm/validate-qishui` | 校验汽水音乐分享链接 |
| GET | `/api/bgm/{id}/cover` | BGM 封面 |
| POST | `/api/mixed-audios` | 创建合成任务 |
| POST | `/api/mixed-audios/{id}/regenerate` | 重新生成（覆盖同 ID） |
| GET | `/api/mixed-audios/{id}/task` | 查询合成进度 |
| GET | `/api/mixed-audios` | 音频库列表（分页 / 搜索 / 日期） |
| DELETE | `/api/mixed-audios/batch` | 批量删除 |
| GET | `/api/mixed-audios/{id}` | 资产详情 |
| GET | `/api/mixed-audios/{id}/stream` | Stream 播放（Range） |
| PUT/GET | `/api/mixed-audios/{id}/playback-progress` | 播放进度（global / inline） |
| DELETE | `/api/mixed-audios/{id}` | 删除资产 |

---

## 设计约束

| 约束 | 说明 |
|------|------|
| **无下载** | `Content-Disposition: inline`；UI 无下载入口 |
| **账号隔离** | 资产绑定 `user_id`；JWT Cookie 多端同步 |
| **无云存储** | 合成文件存于本地 `backend/storage/mixed/` |
| **V2.0 不含** | 忘记密码邮件、OAuth、离线下载 |
| **PWA 限制** | iOS 后台播放受 WebKit 策略影响；须「添加到主屏幕」以 standalone 启动 |

---

## SDD 管理

本项目由 [SDD Harness V7.1](../../) 管理。Agent 入口见 [`AGENTS.md`](AGENTS.md)；任务与测试报告位于 `.sdd/`。

---

## 许可证

暂未指定。如需开源发布，请补充 LICENSE 文件。
