# Podcast Flow V2 原型（Stitch 定稿）

> **本目录 HTML 直接来源于 Stitch 导出，仅用于 V2 设计验证，非生产前端源码。**  
> 源文件：`stitch-reference/`（与 `/Users/liumaoxin/Downloads/stitch_podcast_flow_ui_system` 一致）

## 页面与 Stitch 对应关系

| 原型文件 | Stitch 源 | 说明 |
|----------|-----------|------|
| `auth.html` | `podcast_flow_desktop/code.html` | 登录 |
| `index.html` | `desktop_1/code.html` | 创建 · 步骤 1 内容上传 |
| `create-mix.html` | `desktop_2/code.html` | 创建 · 步骤 2 混音配置 |
| `create-confirm.html` | `desktop_5/code.html` | 创建 · 步骤 3 确认与生成 |
| `library.html` | `desktop_3/code.html` | 我的组合音频 |
| `detail.html` | `desktop_4/code.html` | 组合音频详情 |

## 快速预览

```bash
cd docs/prototypes/v2
python3 -m http.server 8765
```

- http://127.0.0.1:8765/auth.html
- http://127.0.0.1:8765/index.html
- http://127.0.0.1:8765/create-mix.html
- http://127.0.0.1:8765/create-confirm.html
- http://127.0.0.1:8765/library.html
- http://127.0.0.1:8765/detail.html

## 导航路径（原型串联）

1. `auth.html` 登录 → `index.html`
2. `index.html` 下一步 → `create-mix.html`
3. `create-mix.html` 上一步 → `index.html`；下一步 → `create-confirm.html`
4. `create-confirm.html` 上一步 → `create-mix.html`；成功态「查看详情」→ `detail.html`
5. `library.html` 首张卡片详情 → `detail.html`
6. `detail.html` 返回 / 前往调整混音 → `library.html` / `create-mix.html`

## 说明

- 各页 **Tailwind 配置、内联样式、DOM 结构** 与 Stitch 导出保持一致，未使用 `common.js` 动态拼装。
- `assets/common.js`、`assets/stitch.css` 等为旧版抽象层，**当前页面不引用**。
- 生产实现须用 React + TypeScript + Vite 按 Stitch 设计重建，不得直接复制本目录 HTML。
