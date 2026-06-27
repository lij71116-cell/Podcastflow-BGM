# Podcast Flow 原型交接说明

> **本目录 HTML 仅用于设计验证，非生产前端源码。**  
> 生产实现须使用 React + TypeScript + Vite + Ant Design 重建。

## 快速预览

在浏览器中打开：

```text
docs/prototypes/index.html
```

推荐视口：**1440×900** 桌面 Web。

## 已走快速路径

Design Spec 明确，直接生成高保真 HTML 原型（跳过 Junior Pass）。

## 页面清单

| 文件 | 对应页面 | 说明 |
|------|---------|------|
| `index.html` | P01 创建组合音频 | 可点击 flow demo：解析 → BGM → 生成 → 播放 |
| `library.html` | P02 我的组合音频库 | 2 条示例资产 + 删除确认 |
| `detail.html` | P03 组合音频详情 | 内嵌播放器 + BGM/混音只读信息 |

全局组件 **G01 全局底部播放器** 嵌入三个页面，播放时出现。

## 关键组件清单

- AppHeader（顶栏导航）
- StepCard（创建页步骤卡片 1–6）
- PodcastInfoCard（播客信息 + 封面取色 accent 左边线）
- BgmInputPanel（上传 / 链接切换）
- MixControlPanel（音量 Slider + 循环 Switch）
- TaskStatusPanel（合成进度）
- AssetCard（音频库双列卡片）
- InlinePlayer（详情页内嵌播放器）
- GlobalPlayerBar（全局底部播放器）
- EmptyState / ConfirmModal

## 交互状态（已覆盖）

| 场景 | 状态 |
|------|------|
| 解析播客 | loading → 成功（封面取色 accent）/ 失败 Alert |
| BGM | 上传或链接校验 → 可用 Tag |
| 生成 | disabled → 进度条 → 成功引导 |
| 播放 | G01 出现 / 暂停 / 关闭 |
| 删除 | Modal 二次确认 |

## Mock 数据结构

见 `assets/common.js`：

- `MOCK_PODCAST` → PodcastSource DTO（不含 audio_source_url）
- `MOCK_BGM` → BgmSource
- `MOCK_ASSETS` → MixedAudioAsset 列表

创建成功后写入 `sessionStorage.pf_assets`。

## 需要真实 API 的位置

| 原型交互 | 生产 API |
|---------|---------|
| 解析播客 | `POST /api/podcasts/parse` |
| BGM 上传 | `POST /api/bgm/upload` |
| BGM 链接校验 | `POST /api/bgm/validate-url` |
| 生成组合音频 | `POST /api/mixed-audios` |
| 任务状态 | `GET /api/mixed-audios/{id}/task` |
| 音频库列表 | `GET /api/mixed-audios` |
| 详情 | `GET /api/mixed-audios/{id}` |
| 播放 | `GET /api/mixed-audios/{id}/stream` |
| 删除 | `DELETE /api/mixed-audios/{id}` |

## 生产必须实现的视觉效果

- Primary 墨绿 `#1A3C34`
- 播客解析成功后封面取色 accent（进度条、步骤 badge、StepCard 2 左边线）
- 全局底部播放器跨页不中断
- **全站无下载按钮**

## 仅为原型展示的效果

- FFmpeg 合成进度为模拟动画
- 音频播放为计时器模拟，无真实 audio stream
- 封面为色块 + 首字，非真实图片

## 设计参考

- `.sdd/tmp/visual-research.md`（阶段 R 竞品调研）
- `.sdd/tmp/ui-design-spec.md`（阶段 B1 Design Spec，B2 完成后可清理）

## 关键用户路径验证

1. `index.html` → 解析播客 → 上传 BGM → 生成 → 播放（G01 出现）
2. `index.html` → 生成成功 → 进入音频库 → `library.html`
3. `library.html` → 详情 → `detail.html?id=mixed_001` → 内嵌播放
