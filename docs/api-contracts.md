# 接口契约

> 前端 Mock 和后端实现的唯一对齐依据。任何变更必须同步更新本文件。  
> 项目：Podcast Flow · 版本：V2.0（V1 MVP 基线 + 本章增量）· 2026-06-29

---

## 通用约定

### 统一响应格式

```json
// 成功
{ "code": 200, "message": "success", "data": { } }

// 错误
{ "code": 40001, "message": "链接格式无效", "data": null }

// 列表（MVP 全量返回，V2 可加分页）
{ "code": 200, "message": "success", "data": { "items": [], "total": 2 } }
```

### HTTP 状态码

| HTTP | 含义 |
|------|------|
| 200 | 成功（含 stream 二进制响应） |
| 400 | 请求参数错误 |
| 401 | Session 无效或缺失 |
| 403 | 资源不属于当前 Session |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 业务错误码

| code | 含义 |
|------|------|
| 200 | 成功 |
| 40001 | 链接格式无效 |
| 40002 | 播客解析失败 |
| 40003 | BGM 格式不支持 |
| 40004 | BGM 文件过大 |
| 40005 | BGM 不可用 |
| 40006 | 合成任务失败 |
| 40007 | 汽水音乐链接格式无效 |
| 40008 | 汽水音乐解析失败 |
| 40009 | 汽水音乐曲目不可用（付费） |
| 40301 | 无权访问该资产 |
| 40401 | 资源不存在 |
| 50001 | 服务器内部错误 |

### Session 约定

- Cookie 名：`podcast_flow_session`（HttpOnly，SameSite=Lax）
- 首次请求无 Cookie 时，后端自动创建 Session 并在响应 Set-Cookie
- 所有业务接口（除 `/health`）需携带 Session Cookie
- 前端 Axios 配置 `withCredentials: true`

### 时间格式

- 所有 datetime 字段使用 ISO 8601 字符串：`2026-06-23T16:20:00+08:00`

---

## 共享 DTO 定义

### PodcastSourceDTO

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "source_type": "xiaoyuzhou_episode",
  "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e",
  "episode_id": "696f522e109824f9e18a114e",
  "title": "自我进化论｜No.78：情关过后，人生尽是自由",
  "podcast_name": "自我进化论",
  "cover_url": "https://example.com/cover.jpg",
  "duration": 3180,
  "description": "探讨情感关系中的成长与自我解放。",
  "created_at": "2026-06-23T16:00:00+08:00"
}
```

> **禁止返回** `audio_source_url` 字段。

### BgmSourceDTO

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "source_type": "upload",
  "source_url": null,
  "title": "Focus Rain",
  "duration": 180,
  "format": "mp3",
  "status": "available",
  "created_at": "2026-06-23T16:05:00+08:00"
}
```

> **禁止返回** `file_path` 字段。

### MixConfigDTO

```json
{
  "podcast_volume": 1.0,
  "podcast_playback_rate": 1.0,
  "bgm_volume": 0.15,
  "bgm_playback_rate": 1.0,
  "bgm_loop": true
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| podcast_volume | float | 播客音量（0–2.0） |
| podcast_playback_rate | float | 播客倍速（0.6–2.0，默认 1.0） |
| bgm_volume | float | BGM 音量（0–2.0） |
| bgm_playback_rate | float | BGM 倍速（0.6–2.0，默认 1.0） |
| bgm_loop | boolean | BGM 是否循环铺满 |

### MixedAudioAssetDTO（列表项 / 详情）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "title": "自我进化论｜No.78：情关过后，人生尽是自由 - Focus Mix",
  "duration": 3180,
  "status": "completed",
  "play_url": "/api/mixed-audios/550e8400-e29b-41d4-a716-446655440003/stream",
  "download_enabled": false,
  "created_at": "2026-06-23T16:20:00+08:00",
  "updated_at": "2026-06-23T16:20:00+08:00",
  "podcast": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "自我进化论｜No.78：情关过后，人生尽是自由",
    "podcast_name": "自我进化论",
    "cover_url": "https://example.com/cover.jpg",
    "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e"
  },
  "bgm": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "title": "Focus Rain",
    "source_type": "upload",
    "duration": 180
  },
  "mix_config": {
    "podcast_volume": 1.0,
    "bgm_volume": 0.15,
    "bgm_loop": true
  }
}
```

> **禁止返回** `output_file_path`、`error_message`（详情页失败态除外，见详情接口）。

### MixTaskDTO

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "mixed_audio_id": "550e8400-e29b-41d4-a716-446655440003",
  "status": "mixing",
  "progress": 70,
  "error_message": null,
  "started_at": "2026-06-23T16:18:00+08:00",
  "completed_at": null
}
```

---

## 接口清单

### GET /health

**说明：** 健康检查，无需 Session。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "ok",
    "ffmpeg_available": true
  }
}
```

---

### POST /api/podcasts/parse

**说明：** 解析小宇宙公开单集链接，保存 PodcastSource 并返回 DTO。

**请求体：**

```json
{
  "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e"
}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "source_type": "xiaoyuzhou_episode",
    "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e",
    "episode_id": "696f522e109824f9e18a114e",
    "title": "自我进化论｜No.78：情关过后，人生尽是自由",
    "podcast_name": "自我进化论",
    "cover_url": "https://example.com/cover.jpg",
    "duration": 3180,
    "description": "探讨情感关系中的成长与自我解放。",
    "created_at": "2026-06-23T16:00:00+08:00"
  }
}
```

**响应（失败 400 · 链接格式无效）：**

```json
{
  "code": 40001,
  "message": "链接格式无效，请输入小宇宙公开单集链接（xiaoyuzhoufm.com/episode/{id}）",
  "data": null
}
```

**响应（失败 400 · 解析失败）：**

```json
{
  "code": 40002,
  "message": "播客解析失败，请检查链接是否为公开单集",
  "data": null
}
```

---

### POST /api/bgm/upload

**说明：** 上传本地 BGM 文件（multipart/form-data）。

**请求体（multipart）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | mp3 / m4a / wav，最大 50MB |

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "source_type": "upload",
    "source_url": null,
    "title": "Focus Rain",
    "duration": 180,
    "format": "mp3",
    "status": "available",
    "created_at": "2026-06-23T16:05:00+08:00"
  }
}
```

**响应（失败 400 · 格式不支持）：**

```json
{
  "code": 40003,
  "message": "BGM 格式不支持，仅支持 mp3 / m4a / wav",
  "data": null
}
```

**响应（失败 400 · 文件过大）：**

```json
{
  "code": 40004,
  "message": "BGM 文件过大，最大支持 50MB",
  "data": null
}
```

---

### POST /api/bgm/validate-url

**说明：** 校验 BGM 公开链接并下载至后端存储。

**请求体：**

```json
{
  "source_url": "https://example.com/focus-bgm.mp3"
}
```

**响应（成功 200 · 可用）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "source_type": "url",
    "source_url": "https://example.com/focus-bgm.mp3",
    "title": "Focus Rain",
    "duration": 180,
    "format": "mp3",
    "status": "available",
    "created_at": "2026-06-23T16:05:00+08:00"
  }
}
```

**响应（失败 400 · 不可用）：**

```json
{
  "code": 40005,
  "message": "BGM 链接不可用，请重新上传或更换链接",
  "data": null
}
```

---

### POST /api/bgm/validate-qishui

**说明：** 校验汽水音乐分享链接，解析曲目信息并下载音频至后端存储。

**请求体：**

```json
{
  "share_url": "https://qishui.douyin.com/s/imfkVHXh/"
}
```

**支持链接格式：**

- `https://qishui.douyin.com/s/{code}/`（分享短链）
- `https://music.douyin.com/qishui/share/track?track_id=...`（曲目页）

**响应（成功 200）：** 同 BgmSourceDTO，`source_type` 为 `qishui_share`。

**响应（失败 400 · 格式无效）：** code `40007`

**响应（失败 400 · 解析失败）：** code `40008`

**响应（失败 400 · 付费曲目）：** code `40009`，message「该曲目为付费内容，无法作为 BGM 使用…」

---

### GET /api/podcasts/{id}/stream

**说明：** 代理播放已解析播客的原始音频，供创建页试听；支持 HTTP Range（拖动进度条）；Session 校验。

---

### GET /api/bgm/{id}/stream

**说明：** 播放已校验 BGM 本地文件；支持 Range；Session 校验；`Content-Disposition: inline`。

**创建页试听：** 前端双轨同步播放上述两个 stream，播客轨展示原生进度控件；播放过程中调整音量滑块实时生效，不中断播放。

---

### POST /api/mixed-audios/preview

**说明：** （可选/遗留）服务端 FFmpeg 短片段试听。当前创建页已改用客户端双轨试听，本接口保留供后续扩展。

---

### POST /api/mixed-audios

**说明：** 创建组合音频资产并启动 FFmpeg 合成任务。

**请求体：**

```json
{
  "podcast_source_id": "550e8400-e29b-41d4-a716-446655440001",
  "bgm_source_id": "550e8400-e29b-41d4-a716-446655440002",
  "mix_config": {
    "podcast_volume": 1.0,
    "bgm_volume": 0.15,
    "bgm_loop": true
  },
  "title": "自我进化论｜No.78：情关过后，人生尽是自由 - Focus Mix"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| podcast_source_id | string | 是 | 已解析的播客 ID |
| bgm_source_id | string | 是 | 已校验的 BGM ID |
| mix_config | MixConfigDTO | 是 | 混音配置 |
| title | string | 否 | 自定义标题；缺省为 `{播客标题} - Mix` |

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "mixed_audio": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "title": "自我进化论｜No.78：情关过后，人生尽是自由 - Focus Mix",
      "duration": 3180,
      "status": "pending",
      "play_url": "/api/mixed-audios/550e8400-e29b-41d4-a716-446655440003/stream",
      "download_enabled": false,
      "created_at": "2026-06-23T16:18:00+08:00",
      "updated_at": "2026-06-23T16:18:00+08:00",
      "podcast": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "自我进化论｜No.78：情关过后，人生尽是自由",
        "podcast_name": "自我进化论",
        "cover_url": "https://example.com/cover.jpg",
        "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e"
      },
      "bgm": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "title": "Focus Rain",
        "source_type": "upload",
        "duration": 180
      },
      "mix_config": {
        "podcast_volume": 1.0,
        "bgm_volume": 0.15,
        "bgm_loop": true
      }
    },
    "task": {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "mixed_audio_id": "550e8400-e29b-41d4-a716-446655440003",
      "status": "pending",
      "progress": 0,
      "error_message": null,
      "started_at": null,
      "completed_at": null
    }
  }
}
```

**响应（失败 404）：**

```json
{
  "code": 40401,
  "message": "播客或 BGM 资源不存在",
  "data": null
}
```

---

### GET /api/mixed-audios/{id}/task

**说明：** 查询合成任务状态，前端每 2 秒轮询直至 `completed` 或 `failed`。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | mixed_audio_id |

**响应（成功 200 · 合成中）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "mixed_audio_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "mixing",
    "progress": 70,
    "error_message": null,
    "started_at": "2026-06-23T16:18:30+08:00",
    "completed_at": null
  }
}
```

**响应（成功 200 · 已完成）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "mixed_audio_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "completed",
    "progress": 100,
    "error_message": null,
    "started_at": "2026-06-23T16:18:30+08:00",
    "completed_at": "2026-06-23T16:20:00+08:00"
  }
}
```

**响应（成功 200 · 失败）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "mixed_audio_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "failed",
    "progress": 45,
    "error_message": "音频源读取超时",
    "started_at": "2026-06-23T16:18:30+08:00",
    "completed_at": "2026-06-23T16:19:10+08:00"
  }
}
```

**响应（失败 403）：**

```json
{
  "code": 40301,
  "message": "无权访问该资产",
  "data": null
}
```

---

### GET /api/mixed-audios

**说明：** 获取当前 Session 下所有组合音频，按 `created_at` 倒序。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "title": "自我进化论｜No.78：情关过后，人生尽是自由 - Focus Mix",
        "duration": 3180,
        "status": "completed",
        "play_url": "/api/mixed-audios/550e8400-e29b-41d4-a716-446655440003/stream",
        "download_enabled": false,
        "created_at": "2026-06-23T16:20:00+08:00",
        "updated_at": "2026-06-23T16:20:00+08:00",
        "podcast": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "title": "自我进化论｜No.78：情关过后，人生尽是自由",
          "podcast_name": "自我进化论",
          "cover_url": "https://example.com/cover.jpg",
          "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e"
        },
        "bgm": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "title": "Focus Rain",
          "source_type": "upload",
          "duration": 180
        },
        "mix_config": {
          "podcast_volume": 1.0,
          "bgm_volume": 0.15,
          "bgm_loop": true
        }
      }
    ],
    "total": 1
  }
}
```

---

### GET /api/mixed-audios/{id}

**说明：** 获取组合音频详情。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | mixed_audio_id |

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "title": "自我进化论｜No.78：情关过后，人生尽是自由 - Focus Mix",
    "duration": 3180,
    "status": "completed",
    "play_url": "/api/mixed-audios/550e8400-e29b-41d4-a716-446655440003/stream",
    "download_enabled": false,
    "error_message": null,
    "created_at": "2026-06-23T16:20:00+08:00",
    "updated_at": "2026-06-23T16:20:00+08:00",
    "podcast": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "自我进化论｜No.78：情关过后，人生尽是自由",
      "podcast_name": "自我进化论",
      "cover_url": "https://example.com/cover.jpg",
      "source_url": "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e"
    },
    "bgm": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "Focus Rain",
      "source_type": "upload",
      "duration": 180
    },
    "mix_config": {
      "podcast_volume": 1.0,
      "bgm_volume": 0.15,
      "bgm_loop": true
    }
  }
}
```

**响应（失败 404）：**

```json
{
  "code": 40401,
  "message": "组合音频不存在",
  "data": null
}
```

---

### GET /api/mixed-audios/{id}/stream

**说明：** Stream 播放组合音频，支持 HTTP Range。禁止下载。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | mixed_audio_id |

**请求头（可选）：**

```
Range: bytes=0-
```

**响应（成功 200 / 206）：**

- Content-Type: `audio/mpeg`
- Content-Disposition: `inline`（禁止 `attachment`）
- Accept-Ranges: `bytes`
- Body: MP3 二进制流

**响应（失败 403 · 未完成合成）：**

```json
{
  "code": 40301,
  "message": "组合音频尚未合成完成，暂不可播放",
  "data": null
}
```

**响应（失败 404）：**

```json
{
  "code": 40401,
  "message": "组合音频不存在",
  "data": null
}
```

---

### DELETE /api/mixed-audios/{id}

**说明：** 删除组合音频资产及本地合成文件。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | mixed_audio_id |

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deleted": true,
    "id": "550e8400-e29b-41d4-a716-446655440003"
  }
}
```

**响应（失败 403）：**

```json
{
  "code": 40301,
  "message": "无权删除该资产",
  "data": null
}
```

**响应（失败 404）：**

```json
{
  "code": 40401,
  "message": "组合音频不存在",
  "data": null
}
```

---

## 前端 Mock 对齐说明

| Mock 文件（建议路径） | 对应接口 |
|---------------------|---------|
| `frontend/src/mocks/podcast.ts` | POST /api/podcasts/parse |
| `frontend/src/mocks/bgm.ts` | POST /api/bgm/upload, POST /api/bgm/validate-url |
| `frontend/src/mocks/mixed-audio.ts` | POST/GET/DELETE /api/mixed-audios/* |

Mock 数据结构必须与本文件 DTO 定义完全一致。联调时设置 `VITE_USE_MOCK=false` 切换真实后端。

---

## V2.0 增量（2026-06-29）

> V1 接口保持兼容语义，但 **鉴权从匿名 Session 改为登录用户 JWT**。V2 开发完成后，业务接口须携带有效登录态；V1 `podcast_flow_session` 仅作迁移期兼容或废弃（不合并数据）。

### V2 鉴权约定

- 登录成功后响应 `Set-Cookie: podcast_flow_token`（HttpOnly，SameSite=Lax）或等价 Bearer Token（由实现选定，前后端统一）
- 未登录访问受保护接口 → HTTP 401，`code: 40101`
- 资源不属于当前用户 → HTTP 403，`code: 40301`
- 前端 Axios 继续 `withCredentials: true`；401 时跳转 `/auth`

### UserDTO

```json
{
  "id": "u_550e8400-e29b-41d4-a716-446655440000",
  "username": "focus_listener",
  "email": "user@example.com",
  "display_name": "focus_listener",
  "created_at": "2026-06-29T10:00:00+08:00"
}
```

> **禁止返回** `password_hash`、重置 Token 明文。

### MixConfigDTO（V2 扩展）

在 V1 字段基础上增加：

| 字段 | 类型 | 说明 | 默认 |
|------|------|------|------|
| fade_in | integer | BGM 淡入秒数（0–30） | 0 |
| fade_out | integer | BGM 淡出秒数（0–30） | 0 |

### PlaybackProgressDTO

```json
{
  "mixed_audio_id": "550e8400-e29b-41d4-a716-446655440003",
  "player_context": "global",
  "position_seconds": 125.5,
  "duration_seconds": 3180,
  "updated_at": "2026-06-29T12:00:00+08:00"
}
```

| player_context | 说明 |
|----------------|------|
| `global` | 底部 GlobalPlayerBar |
| `inline` | 详情页内嵌播放器 |

### PaginatedMixedAudioListDTO

```json
{
  "items": [ /* MixedAudioAssetDTO */ ],
  "total": 42,
  "page": 1,
  "page_size": 10
}
```

---

### POST /api/auth/register

**说明：** 用户注册（无邮箱验证）。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 全局唯一，3–32 字符 |
| email | string | 是 | 全局唯一，合法邮箱 |
| password | string | 是 | ≥8 字符 |
| password_confirm | string | 是 | 与 password 一致 |

**响应（成功 200）：** `{ "code": 200, "data": { "user": UserDTO, "token": "..." } }`

**错误码：** `40010` 用户名已存在 · `40011` 邮箱已存在 · `40012` 密码不一致

---

### POST /api/auth/login

**说明：** 双模式登录。

**请求体（二选一）：**

```json
{ "mode": "username", "username": "focus_listener", "password": "********" }
```

```json
{ "mode": "email", "email": "user@example.com", "password": "********" }
```

**响应（成功 200）：** `{ "code": 200, "data": { "user": UserDTO, "token": "..." } }`

**错误码：** `40102` 用户名或密码错误

---

### POST /api/auth/logout

**说明：** 登出，清除服务端会话/Token 黑名单（若采用）。

**响应（成功 200）：** `{ "code": 200, "data": { "logged_out": true } }`

---

### POST /api/auth/forgot-password

> **V2.0 不实现**，接口契约保留供 V2.x 邮件功能接入。

**说明：** 发送重置密码邮件。

**请求体：** `{ "email": "user@example.com" }`

**响应（成功 200）：** 统一返回成功（不泄露邮箱是否存在）

**错误码：** `50302` 邮件服务不可用（开发 Mock 时可返回 mock 重置链接）

---

### POST /api/auth/reset-password

> **V2.0 不实现**，随 forgot-password 一并延后。

**请求体：** `{ "token": "...", "password": "...", "password_confirm": "..." }`

**错误码：** `40013` Token 无效或过期

---

### POST /api/auth/change-password

**说明：** 登录后修改密码。

**请求体：** `{ "current_password": "...", "new_password": "...", "new_password_confirm": "..." }`

**需登录：** 是

---

### GET /api/auth/me

**说明：** 获取当前登录用户。

**需登录：** 是

**响应（成功 200）：** `{ "code": 200, "data": UserDTO }`

---

### GET /api/mixed-audios（V2 分页）

**说明：** 获取当前 **用户** 下组合音频，支持分页与筛选。

**Query 参数：**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | integer | 1 | 页码，从 1 开始 |
| page_size | integer | 10 | 每页条数，最大 50 |
| q | string | — | 标题或播客名关键词 |
| created_date | string | — | ISO 日期 `YYYY-MM-DD`，按创建日筛选 |

**响应（成功 200）：** `data` 为 PaginatedMixedAudioListDTO

---

### DELETE /api/mixed-audios/batch

**说明：** 批量删除当前用户拥有的组合音频。

**请求体：** `{ "ids": ["id1", "id2"] }`

**响应（成功 200）：**

```json
{
  "code": 200,
  "data": {
    "deleted_count": 2,
    "deleted_ids": ["id1", "id2"]
  }
}
```

---

### PUT /api/mixed-audios/{id}/playback-progress

**说明：** 上报播放进度（节流由前端控制，建议每 5–10 秒或 pause/seek 时上报）。

**需登录：** 是

**请求体：**

| 字段 | 类型 | 必填 |
|------|------|------|
| player_context | string | 是 |
| position_seconds | number | 是 |
| duration_seconds | number | 否 |

**响应（成功 200）：** `{ "code": 200, "data": PlaybackProgressDTO }`

---

### GET /api/mixed-audios/{id}/playback-progress

**Query：** `player_context=global|inline`

**响应（成功 200）：** `{ "code": 200, "data": PlaybackProgressDTO | null }`

---

### POST /api/mixed-audios/{id}/regenerate

**说明：** 基于请求体中的混音配置 **覆盖** 当前资产（不新建 ID）。创建 MixTask 并异步合成。

**需登录：** 是 · 资产须属于当前用户 · 合成中不可重复提交

**请求体：**

| 字段 | 类型 | 必填 |
|------|------|------|
| mix_config | MixConfigDTO | 是 |
| bgm_id | string | 否 | 若更换 BGM 则传新 bgm_id |

**响应（成功 200）：** 同 POST /api/mixed-audios 返回 mixed_audio + task

---

### V2 业务错误码增量

| code | 含义 |
|------|------|
| 40101 | 未登录或 Token 无效 |
| 40102 | 用户名或密码错误 |
| 40010 | 用户名已存在 |
| 40011 | 邮箱已存在 |
| 40012 | 密码不一致 |
| 40013 | 重置 Token 无效或过期 |
| 50302 | 邮件服务不可用 |
