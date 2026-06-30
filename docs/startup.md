# Podcast Flow 启动与验收指南

> V2.0 · 最后更新：2026-06-29

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
CORS_ORIGINS=http://localhost:5199,http://127.0.0.1:5199,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5176,http://127.0.0.1:5176,http://localhost:5201,http://127.0.0.1:5201
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
| 用户门禁 / PWA preview | 5176（preview） | 8003 |

切换方式：修改 `frontend/.env` 中 `VITE_BACKEND_PROXY_TARGET` 与后端 `PORT`。

### PWA / 生产构建预览

```bash
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 5176
```

浏览器打开：http://127.0.0.1:5176（默认 preview 端口 5176，避免与占用 5175 的其他项目冲突）

> **注意**：PWA、Service Worker 与后台播放能力仅在 `npm run build` + `npm run preview`（或生产部署）下生效；`npm run dev` 不会注册 SW。

### 移动端后台播放（PWA）

将站点「添加到主屏幕」后，可在切换 App 或锁屏时继续播放音频。实现要点：

| 能力 | 说明 |
|------|------|
| Media Session API | 全局播放器与详情页内嵌播放器均绑定锁屏/通知栏控件（播放、暂停、快进/快退、拖动进度） |
| 移动端 audio 属性 | `playsInline`、`preload="auto"`，避免 iOS 全屏抢占并提升后台续播稳定性 |
| PWA standalone | `manifest.webmanifest` 中 `display: standalone`，从桌面图标启动时行为接近原生 App |

**验收步骤（需真机 + preview/生产构建）**

1. 手机与电脑同一局域网；`npm run build && npm run preview -- --host 0.0.0.0 --port 5176`
2. 手机浏览器打开 `http://<电脑局域网 IP>:5176`，按引导「添加到主屏幕」
3. 从桌面图标启动 → 登录 → 播放任意已完成组合音频
4. 切到其他 App 或锁屏 → 音频应继续播放；锁屏界面应显示标题/封面与控制按钮
5. 在锁屏点暂停/播放，回到 App 后状态应同步

**平台限制**

| 平台 | 说明 |
|------|------|
| iOS Safari PWA | 需 iOS 15+；须先在 App 内开始播放再切后台；系统可能因省电策略偶尔暂停，锁屏控件可恢复 |
| Android Chrome PWA | 后台播放与 Media Session 支持较好 |
| 桌面浏览器 | 标签页切到后台通常可继续播放，但非 PWA 场景无锁屏控件 |

**排查**

- 无锁屏控件：确认从 preview（5176）或生产环境打开，且已开始播放
- 切后台即停：确认通过「添加到主屏幕」以 standalone 打开，而非普通浏览器标签
- 图标/缓存旧版：删除主屏幕快捷方式后重新安装；Chrome DevTools → Application → Service Worker 可查看 `sw.js` 是否激活

## 自动化验收（T-030 · V2 收官回归）

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

**T-030 回归结果（2026-06-29）**

| 检查项 | 结果 |
|--------|------|
| pytest | 86 passed |
| ruff | 通过 |
| mypy | 通过（51 files） |
| type-check / lint / build | 通过（lint 3 warnings，无 error） |
| FFmpeg | 8.1.2 已安装 |
| VITE_USE_MOCK | false（`.env` + `.env.production`） |
| 用户门禁 | **已通过（2026-06-29）** |
| 下载按钮 | 全站 UI 无「下载」入口 |
| 路由守卫 | `/` `/library` `/detail/*` 经 `ProtectedRoute` 需登录 |

> 完整测试报告：`.sdd/test-reports/T-030.md`

## 自动化验收（T-014 · 历史）

**T-014 回归结果（2026-06-25）**

| 检查项 | 结果 |
|--------|------|
| pytest | 60 passed |
| ruff | 通过 |
| mypy | 通过 |
| type-check / lint / build | 通过 |
| FFmpeg | 8.1.2 已安装 |
| VITE_USE_MOCK | false（真实 API） |

## 全链路手动验收清单（V2）

按顺序在浏览器完成（需 `VITE_USE_MOCK=false`）：

1. **注册 / 登录** — `/auth` 注册新账号；未登录访问 `/library` 应跳转登录
2. **创建页 /** — 小宇宙公开单集链接解析；BGM 本地上传 / 链接 / 汽水音乐；混音含淡入淡出
3. **生成** — 合成完成，状态「已完成」
4. **音频库 /library** — 搜索、日期筛选、分页、批量删除
5. **播放** — 列表「播放」→ 底部全局播放器有声音；跨页不中断
6. **续播** — 播放中途刷新或重进，应提示并恢复进度（global / inline 各自记忆）
7. **详情 /detail/:id** — 内嵌播放器、BGM 封面、重新生成（覆盖同 ID）
8. **PWA** — preview 5176 移动视口可见安装引导；安装后主题色与图标正确
9. **后台播放** — 真机 PWA：切 App / 锁屏后音频继续，锁屏控件可用
10. **合规** — 全站无「下载」按钮

## Session / 账号说明

- V2 使用账号登录（JWT Cookie），同一账号多端共享音频库
- 前端 axios 已配置 `withCredentials: true`
- 旧版 Session Cookie 数据不会自动迁移到新账号

## 常见问题

| 现象 | 处理 |
|------|------|
| 合成失败 / 503 | 确认 `ffmpeg -version` 可用 |
| 播放无声音 | 确认资产状态为「已完成」；后端 8100 运行中 |
| 播客解析失败 | 确认链接为小宇宙公开单集 URL |
| 跨页播放中断 | 确认 GlobalPlayerBar 在 Router 外层 |
| PWA 后台不播 | 须 build+preview 或生产环境；真机「添加到主屏幕」后从图标启动 |
| 锁屏无控件 | iOS 需先在前台开始播放；检查 Media Session 是否绑定（Chrome Remote Debugging） |

## 数据目录

| 路径 | 内容 |
|------|------|
| `backend/data/podcast_flow.db` | SQLite 业务数据 |
| `backend/storage/bgm/` | 上传的 BGM |
| `backend/storage/mixed/` | 合成后的 MP3 |
