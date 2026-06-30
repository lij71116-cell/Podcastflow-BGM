# 开发计划

> 设计阶段与开发阶段的衔接文件。所有开发进度以本文件为准。  
> 项目：Podcast Flow · V1 MVP 已完成 · **V2.0 已收官（T-030 用户门禁通过）** · 2026-06-29

---

## 一、功能清单总览

| 序号 | 功能名称 | 一句话描述 | 对应页面 | 优先级 | 状态 |
|------|---------|-----------|---------|--------|------|
| F01 | 小宇宙链接解析 | 解析公开单集元数据 | P01 | MVP | 待开发 |
| F02 | BGM 上传 | 上传本地 BGM 并校验 | P01 | MVP | 待开发 |
| F03 | BGM 链接校验 | 校验公开 BGM 链接 | P01 | MVP | 待开发 |
| F04 | 混音参数配置 | 音量 + 循环设置 | P01 | MVP | 待开发 |
| F05 | 音频合成任务 | FFmpeg 异步合成 | P01 | MVP | 待开发 |
| F06 | 合成状态轮询 | 展示任务进度与结果 | P01 | MVP | 待开发 |
| F07 | 组合音频列表 | 展示 Session 下所有资产 | P02 | MVP | 已完成（2026-06-25） |
| F08 | 组合音频详情 | 展示完整信息与混音参数 | P03 | MVP | 已完成（2026-06-25） |
| F09 | Stream 播放 | 前端播放组合音频 | P01/P02/P03/G01 | MVP | 已完成（2026-06-25） |
| F10 | 全局播放器 | 跨页连续播放 | G01 | MVP | 已完成（2026-06-25） |
| F11 | 删除资产 | 删除组合音频及文件 | P02/P03 | MVP | 已完成（2026-06-25） |
| F12 | Session 隔离 | Cookie 级资产隔离 | 全局 | MVP | 待开发 |
| F13 | 淡入淡出 | BGM 淡入淡出 | P01 | V1.1 | 延后 |
| F14 | 重新生成 | 基于旧配置重新合成 | P02/P03 | V1.1 | 延后 |
| F15 | 搜索筛选 | 音频库搜索 | P02 | V1.2 | 延后 |

---

## 二、数据契约摘要

完整数据契约见 `docs/PRD.md` 第 6 章「数据契约确认清单」。

统一响应格式与接口字段定义见 `docs/api-contracts.md`（**唯一权威源**）。

核心实体：`PodcastSource`、`BgmSource`、`MixConfig`、`MixedAudioAsset`、`MixTask`、`Session`。

---

## 二点五、外部服务与测试权限清单

> PRD A5-3 经用户确认后的落定版。真实 Key 只进 `.env`，本文档仅记录字段与状态。

| 服务 | 用途 | 配置项字段 | MVP 必需 | Tester 完整联调权限 | 缺失时策略 | 状态 |
|------|------|------------|----------|--------------------|------------|------|
| FFmpeg + ffprobe | 音频合成、格式探测 | `FFMPEG_PATH`, `FFPROBE_PATH` | 是 | 系统已安装 ffmpeg | 启动检测失败则合成接口返回 500，标记降级验收 | **已确认 · 系统安装** |
| 小宇宙公开页面 | 解析 episode 元数据与音频源 | 无 Key；`XIAOYUZHOU_BASE_URL` 可选 | 是 | 可访问公开 episode URL | Mock 播客数据开发；真实联调需有效公开链接 | **已确认 · 无 Key** |
| 本地文件存储 | BGM / 合成音频 | `STORAGE_ROOT` | 是 | 读写 `./storage` 目录 | 默认本地磁盘 | **已确认** |
| SQLite | 业务数据持久化 | `DATABASE_URL` | 是 | 读写本地 db 文件 | 默认 SQLite | **已确认** |
| LLM / Embedding / Rerank | — | — | 否 | — | 无 | **无** |
| OSS/S3 | 云存储 | — | 否 | — | V2 引入 | **无** |
| 支付 / 短信 / OAuth | — | — | 否 | — | 无 | **无** |

推荐 `backend/.env`：

```env
STORAGE_ROOT=./storage
DATABASE_URL=sqlite:///./data/podcast_flow.db
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
MAX_BGM_FILE_SIZE_MB=50
SESSION_COOKIE_NAME=podcast_flow_session
CORS_ORIGINS=http://localhost:5173
```

---

## 三、前端开发清单

### 前端技术选型

| 层级 | 选择 | 说明 |
|------|------|------|
| 框架 | React 18 | 业务 Web App |
| 语言 | TypeScript | 组件、service、DTO 类型化 |
| 构建 | Vite | 开发代理、生产构建 |
| 路由 | react-router-dom v6 | `/` `/library` `/detail/:id` |
| 状态管理 | Zustand | 播放器状态、创建流程状态 |
| 请求库 | Axios | 统一实例 + 拦截器 + withCredentials |
| 组件库 | Ant Design 5 | 桌面 Web |
| 工程化 | ESLint + Prettier + tsc + build | 自动验收 |

### 页面开发清单

| 序号 | 页面 | 路由 | 涉及功能 | Mock 数据来源 | 状态 |
|------|------|------|---------|--------------|------|
| P01 | 创建组合音频 | `/` | F01–F06, F09 | api-contracts.md DTO | 待开发 |
| P02 | 我的组合音频库 | `/library` | F07, F09, F11 | GET /api/mixed-audios | 已完成（2026-06-25） |
| P03 | 组合音频详情 | `/detail/:id` | F08, F09, F11 | GET /api/mixed-audios/{id} | 已完成（2026-06-25） |
| G01 | 全局底部播放器 | 全局组件 | F10 | play_url stream | 已完成（2026-06-25） |

### 关键前端组件

| 组件 | 说明 |
|------|------|
| AppHeader | 顶栏导航 |
| StepCard | 创建页步骤卡片 |
| PodcastInfoCard | 播客信息 + 封面取色 accent |
| BgmInputPanel | 上传 / 链接切换 |
| MixControlPanel | 音量 Slider + 循环 Switch |
| TaskStatusPanel | 合成进度 |
| AssetCard | 音频库卡片 |
| InlinePlayer | 详情页播放器 |
| GlobalPlayerBar | 全局底栏播放器 |

### 前端自动验收标准

- [ ] 所有页面 UI 与 `docs/prototypes/` 原型一致
- [ ] Mock 模式下完整走通：解析 → BGM → 生成 → 播放 → 删除
- [ ] Mock 数据格式与 `api-contracts.md` 完全一致
- [ ] 全站无下载按钮
- [ ] 1440×900 视口无溢出、重叠
- [ ] Agent/Tester 自动验收通过

---

## 四、后端开发清单

### Python 环境

- **Python 指令**：`python3`（3.14.5）
- **虚拟环境**：`.venv`（项目根目录，已创建）
- **数据库**：`backend/data/podcast_flow.db`（`init_db.py` 已初始化，含 5 张业务表）
- [x] Agent 已确认 Python 指令（`python3 --version` 输出 3.14.5）

| 序号 | 功能名称 | 依赖 | 对应接口 | 状态 |
|------|---------|------|---------|------|
| B00 | 基础设施（pycore 脚手架） | 无 | GET /health | 已完成（2026-06-26） |
| B01 | Session 中间件 | B00 | 所有 /api/* | 已完成（2026-06-26） |
| B02 | 小宇宙链接解析 | B00, B01 | POST /api/podcasts/parse | 已完成（2026-06-26） |
| B03 | BGM 上传 | B00, B01 | POST /api/bgm/upload | 已完成（2026-06-25） |
| B04 | BGM 链接校验 | B00, B01 | POST /api/bgm/validate-url | 已完成（2026-06-25） |
| B05 | 合成任务创建 | B02, B03/B04 | POST /api/mixed-audios | 已完成（2026-06-26） |
| B06 | FFmpeg 合成 Worker | B05 | 内部异步 | 已完成（2026-06-26） |
| B07 | 任务状态查询 | B05, B06 | GET /api/mixed-audios/{id}/task | 已完成（2026-06-26） |
| B08 | 组合音频列表 | B01 | GET /api/mixed-audios | 已完成（2026-06-25） |
| B09 | 组合音频详情 | B01 | GET /api/mixed-audios/{id} | 已完成（2026-06-25） |
| B10 | Stream 播放 | B06 | GET /api/mixed-audios/{id}/stream | 已完成（2026-06-25） |
| B11 | 删除资产 | B01 | DELETE /api/mixed-audios/{id} | 已完成（2026-06-25） |

### 后端任务验收规则

- 基础设施基于 **pycore**：使用 `ConfigManager`、`APIServer`、db 模板
- B00 验收：ruff/mypy 通过、单元测试通过、`GET /health` 返回 200 且 `ffmpeg_available: true`
- 业务任务验收：`VITE_USE_MOCK=false` 真实联调 + 页面核心操作可用
- Stream 接口：`Content-Disposition: inline`，支持 Range
- 小宇宙解析：httpx 必须 `trust_env=False`

---

## 五、功能详情（开发时逐个展开）

### F05 + B06：FFmpeg 合成（核心）

**输入：** podcast 本地/远程音频 + bgm 文件 + MixConfig  
**处理：** volume filter → bgm loop（如需）→ amix → mp3 输出  
**输出：** `storage/mixed/{id}.mp3`  
**异常：** 超时（30min）、ffmpeg 非零 exit → status=failed

### F01 + B02：小宇宙解析

**输入：** xiaoyuzhou episode URL  
**处理：** 提取 episode_id → httpx 请求公开页/API → 解析 JSON/HTML  
**输出：** PodcastSource 记录（含内部 audio_source_url）  
**异常：** 404/解析结构变化 → 40002

### F09 + B10：Stream 播放

**约束：** 校验 session 归属 + status=completed  
**响应：** audio/mpeg + Range 支持  
**禁止：** attachment 下载

---

## 六、开发顺序建议

### 阶段 1：前端 MVP（Mock，用户先验收 UI/UX）

1. 初始化 `frontend/`（Vite + React + TS + Ant Design）
2. 实现 P01 → P02 → P03 → G01，全部 Mock
3. **用户门禁**：确认布局、配色、交互与原型一致

### 阶段 2：后端基础设施（自动连续执行）

1. 初始化 `backend/`（pycore 脚手架 + SQLite + Session 中间件）
2. 验收：`GET /health` 200、ffmpeg 检测、CORS 配置

### 阶段 3：逐功能闭环开发

推荐顺序：

```text
B02 解析 → B03/B04 BGM → B05/B06/B07 合成 → B08/B09 列表详情 → B10 播放 → B11 删除
```

每个功能：后端 API + 前端 Mock 切真实 + Tester 联调验收。

### 阶段 4：E2E 回归

完整流程：输入链接 → 解析 → 添加 BGM → 生成 → 库内播放 → 详情 → 删除。

**状态（2026-06-25）**：✅ 已完成 — 自动化回归与用户全链路门禁均通过；启动与验收清单见 `docs/startup.md`。

---

## 七、原型与文档索引

| 文件 | 用途 |
|------|------|
| `docs/startup.md` | 启动命令与 E2E 验收清单 |
| `docs/PRD.md` | 产品需求定稿 |
| `docs/api-contracts.md` | 接口契约权威源 |
| `docs/prototypes/index.html` | P01 原型 |
| `docs/prototypes/library.html` | P02 原型 |
| `docs/prototypes/detail.html` | P03 原型 |
| `.sdd/tmp/visual-research.md` | 视觉调研（B2 参考） |
| `.sdd/tmp/ui-design-spec.md` | V2 UI Design Spec（定稿） |
| `docs/prototypes/v2/` | V2 高保真原型（用户已确认） |

---

## 八、V2.0 开发计划（2026-06-29）

> **前置**：V1 MVP（T-001–T-014）已完成；V2 原型与 Design Spec 已确认。  
> **进度**：本节为 V2 唯一进度跟踪区；任务明细见 `.sdd/tasks.json`（T-015 起）。

### 8.1 V2 功能清单

| 序号 | 功能 | 模块 | 对应页面 | 优先级 | 状态 |
|------|------|------|---------|--------|------|
| F16 | 用户注册 / 双模式登录 | A | P-Auth | V2 P0 | 待开发 |
| F17 | 登出 / 路由守卫 | A | 全局 | V2 P0 | 待开发 |
| F18 | 资产 user_id 改造 | A | 后端 | V2 P0 | 待开发 |
| F19 | 忘记 / 修改密码 | A | P-Auth / Settings | V2 P0 | 待开发 |
| F20 | V2 UI 改版（Design Tokens） | B | 全站 | V2 P0 | 待开发 |
| F21 | 创建页 3 Tab 事件轴 | B | P01 | V2 P0 | 待开发 |
| F22 | 移动 H5 响应式 | B | 全站 | V2 P0 | 待开发 |
| F23 | 顶栏账号区 | B | AppHeader | V2 P1 | 待开发 |
| F24 | PWA manifest + SW | B | 全局 | V2 P1 | 待开发 |
| F25 | 列表分页 + 搜索日期筛选 | C | P02 | V2 P1 | 待开发 |
| F26 | 批量删除 | C | P02 | V2 P1 | 待开发 |
| F27 | 播放进度记忆 | C | G01 / P03 | V2 P1 | 待开发 |
| F28 | 淡入淡出 | D | P01 / P03 | V2 P1 | 待开发 |
| F29 | 详情页重新生成（覆盖） | D | P03 | V2 P1 | 待开发 |

### 8.2 V2 外部服务与测试权限

| 服务 | 用途 | 配置项 | V2 必需 | Tester 权限 | 缺失策略 | 状态 |
|------|------|--------|---------|-------------|----------|------|
| FFmpeg + ffprobe | 合成（含 fade） | `FFMPEG_PATH`, `FFPROBE_PATH` | 是 | 系统已安装 | 503 降级 | **已确认** |
| 小宇宙公开页 | 解析 | 同 V1 | 是 | 公开 URL | Mock | **已确认** |
| 本地存储 + SQLite | 数据与音频 | 同 V1 | 是 | 读写目录/db | — | **已确认** |
| 邮件发送 | 忘记密码 | `RESEND_API_KEY` 或 `SMTP_*` | **否（V2.x）** | — | V2.0 不做 | **不适用** |

推荐 `backend/.env` 增量：

```env
JWT_SECRET=<随机密钥>
JWT_EXPIRE_HOURS=168
RESEND_API_KEY=
MAIL_FROM=noreply@example.com
FRONTEND_URL=http://localhost:5175
```

### 8.3 V2 前端页面清单

| 页面 | 路由 | V2 原型 | Mock 先行 | 状态 |
|------|------|---------|-----------|------|
| P-Auth | `/auth` | `v2/auth.html` | 是 | 待开发 |
| P01 | `/` | `v2/index.html` | 是 | 待开发 |
| P02 | `/library` | `v2/library.html` | 是 | 待开发 |
| P03 | `/detail/:id` | `v2/detail.html` | 是 | 待开发 |
| G01 | 全局 | Design Spec | 是 | 待开发 |

### 8.4 V2 后端清单

| 模块 | 说明 | 状态 |
|------|------|------|
| `models/user.py` | User 表 | 待开发 |
| `models/playback_progress.py` | 播放进度 | 待开发 |
| `middleware/auth.py` | JWT/Cookie 鉴权 | 待开发 |
| `routes/auth.py` | 注册/登录/密码 | 待开发 |
| `services/email_service.py` | 忘记密码邮件 | 待开发 |
| 既有 routes | mixed_audios 加分页/批量/重新生成；mix_worker 加 fade | 待开发 |

### 8.5 V2 里程碑

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| M5 | V2 前端 Mock + Auth 页 | 已完成（2026-06-29） |
| M6 | 账号后端 + user_id 迁移 | 已完成（2026-06-29） |
| M7 | 分页/进度/批量删/淡入淡出/重新生成 | 已完成（2026-06-29） |
| M8 | V2 E2E + PWA 冒烟 + startup.md 更新 | **已完成（2026-06-29 · 用户门禁通过）** |

### 8.6 V2 自动验收标准

- [x] 全站 UI 与 `docs/prototypes/v2/` + `ui-design-spec.md` 一致（各任务已逐页验收）
- [x] 登录后跨设备可见同一音频库（用户门禁通过）
- [x] 未登录无法访问 `/` `/library` `/detail/*`（代码 + 单测覆盖）
- [x] 列表分页、批量删除、播放进度、重新生成、淡入淡出均可从前端验证（用户门禁通过）
- [x] PWA manifest 可安装 + 后台播放（用户门禁通过）
- [x] 全站无下载按钮
- [x] Agent/Tester 自动验收 + 用户门禁通过
