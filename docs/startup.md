# Podcast Flow 启动与验收指南

> MVP V1.0 · 最后更新：2026-06-25

## 环境要求

| 组件 | 版本 / 说明 |
|------|-------------|
| Python | 3.11+（项目使用 3.14.5） |
| Node.js | 18+ |
| FFmpeg + ffprobe | 系统 PATH 可执行（合成必需） |
| SQLite | 本地文件，随项目自动创建 |
| 网络 | 可访问小宇宙公开单集页、汽水音乐分享页（BGM 链接模式） |

## 首次准备

```bash
# 项目根目录
cd Projects_Repo/podcast-flow

# Python 虚拟环境（若尚未创建）
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

# 前端依赖
cd frontend && npm install && cd ..
```

### 后端配置

复制并编辑 `backend/.env`（参考 `backend/.env.example`）：

```env
HOST=127.0.0.1
PORT=8100
CORS_ORIGINS=http://localhost:5199,http://127.0.0.1:5199,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5201,http://127.0.0.1:5201
DATABASE_PATH=backend/data/podcast_flow.db
STORAGE_ROOT=backend/storage
SESSION_COOKIE_NAME=podcast_flow_session
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
```

### 前端配置

`frontend/.env`：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
VITE_BACKEND_PROXY_TARGET=http://localhost:8100
```

> **说明**：`VITE_USE_MOCK=false` 时全站业务请求走真实后端；仅当显式设为 `true` 时才启用 axios Mock。

## 启动命令

### 日常开发 / 用户验收（推荐）

```bash
# 终端 1 — 后端（8100）
cd backend
PYTHONPATH=..:. ../.venv/bin/python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8100

# 终端 2 — 前端（5201）
cd frontend
npm run dev -- --host 127.0.0.1 --port 5201
```

浏览器打开：http://127.0.0.1:5201

### Agent / Tester 自动验证端口

| 用途 | 前端 | 后端 |
|------|------|------|
| 自动验证 | 5199 | 8099 |
| 用户门禁 | 5175（preview） | 8003 |

切换方式：修改 `frontend/.env` 中 `VITE_BACKEND_PROXY_TARGET` 与后端 `PORT`。

## 自动化验收（T-014）

在项目根目录执行：

```bash
# 后端
cd backend
../.venv/bin/ruff check src tests
../.venv/bin/mypy src
PYTHONPATH=..:. ../.venv/bin/python -m pytest tests

# 前端
cd ../frontend
npm run type-check
npm run lint
npm run build
```

**T-014 回归结果（2026-06-25）**

| 检查项 | 结果 |
|--------|------|
| pytest | 60 passed |
| ruff | 通过 |
| mypy | 通过 |
| type-check / lint / build | 通过 |
| FFmpeg | 8.1.2 已安装 |
| VITE_USE_MOCK | false（真实 API） |

## 全链路手动验收清单

按顺序在浏览器完成（需 `VITE_USE_MOCK=false`）：

1. **创建页 /** — 输入小宇宙公开单集链接 → 解析成功，展示播客信息
2. **BGM** — 本地上传 / 链接 / 汽水音乐分享 任一方式校验通过
3. **混音配置** — 调节播客/BGM 音量与倍速，点击「试听」双轨播放正常
4. **生成** — 点击「生成组合音频」，等待合成完成（状态「已完成」）
5. **音频库 /library** — 新资产出现在列表顶部；搜索、日期筛选、分页正常
6. **播放** — 点击「播放」，底部全局播放器有声音
7. **跨页** — 播放中进入详情页，音频不中断
8. **详情 /detail/:id** — 信息完整（播客、BGM、混音配置）；内嵌播放器可控
9. **删除** — 确认删除后列表消失；若正在播放则播放器关闭
10. **合规** — 全站无「下载」按钮、无登录入口；无淡入淡出 / 重新生成（V1.1 功能）

## Session 说明

- MVP 无用户登录，通过 Cookie `podcast_flow_session` 隔离资产
- 同一浏览器 Session 内资产共享；换浏览器或清 Cookie 后看不到他人/旧 Session 数据
- 所有 `/api/*` 请求需携带 Cookie（前端 axios 已配置 `withCredentials: true`）

## 常见问题

| 现象 | 处理 |
|------|------|
| 合成失败 / 503 | 确认 `ffmpeg -version` 可用 |
| 播放无声音 | 确认资产状态为「已完成」；后端 8100 运行中 |
| 播客解析失败 | 确认链接为小宇宙公开单集 URL |
| 跨页播放中断 | 确认已更新至 T-012+（GlobalPlayerBar 在 Router 外层） |

## 数据目录

| 路径 | 内容 |
|------|------|
| `backend/data/podcast_flow.db` | SQLite 业务数据 |
| `backend/storage/bgm/` | 上传的 BGM |
| `backend/storage/mixed/` | 合成后的 MP3 |
