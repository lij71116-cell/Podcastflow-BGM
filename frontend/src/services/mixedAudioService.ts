import axios from 'axios'
import http from './http'
import {
  buildPaginatedList,
  LIBRARY_PAGE_SIZE,
  type LibraryListQuery,
} from '@/utils/libraryList'
import type {
  ApiResponse,
  BatchDeleteMixedAudiosResponse,
  CreateMixedAudioResponse,
  MixConfigDTO,
  MixedAudioAssetDTO,
  MixedAudioListResponse,
  MixTaskDTO,
  PlaybackProgressDTO,
  PlayerContext,
  PreviewMixResponseDTO,
} from '@/types/api'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<null> | undefined
    if (body?.message) return body.message
  }
  if (error instanceof Error) return error.message
  return fallback
}

export type ListMixedAudiosParams = LibraryListQuery

export async function getMixedAudioDetail(id: string): Promise<MixedAudioAssetDTO> {
  try {
    const res = (await http.get(`/mixed-audios/${id}`)) as ApiResponse<MixedAudioAssetDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '组合音频不存在'), { cause: error })
  }
}

export async function listMixedAudios(
  params: ListMixedAudiosParams = {},
): Promise<MixedAudioListResponse> {
  const page = Math.max(1, params.page ?? 1)
  const page_size = Math.min(50, Math.max(1, params.page_size ?? LIBRARY_PAGE_SIZE))

  try {
    const res = (await http.get('/mixed-audios', {
      params: {
        ...params,
        page,
        page_size,
      },
    })) as ApiResponse<MixedAudioListResponse>
    if (res.code !== 200) {
      throw new Error(res.message)
    }

    if (typeof res.data.page === 'number' && typeof res.data.page_size === 'number') {
      return res.data
    }

    const paginated = buildPaginatedList(res.data.items, { ...params, page, page_size })
    return paginated
  } catch (error) {
    throw new Error(extractErrorMessage(error, '加载音频库失败'), { cause: error })
  }
}

export async function deleteMixedAudio(id: string): Promise<void> {
  try {
    const res = (await http.delete(`/mixed-audios/${id}`)) as ApiResponse<{
      deleted: boolean
      id: string
    }>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
  } catch (error) {
    throw new Error(extractErrorMessage(error, '删除失败'), { cause: error })
  }
}

export async function deleteMixedAudiosBatch(
  ids: string[],
): Promise<BatchDeleteMixedAudiosResponse> {
  if (ids.length === 0) {
    return { deleted_count: 0, deleted_ids: [] }
  }

  try {
    const res = (await http.delete('/mixed-audios/batch', {
      data: { ids },
    })) as ApiResponse<BatchDeleteMixedAudiosResponse>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch {
    for (const id of ids) {
      await deleteMixedAudio(id)
    }
    return { deleted_count: ids.length, deleted_ids: ids }
  }
}

export async function createMixedAudio(payload: {
  podcast_source_id: string
  bgm_source_id: string
  mix_config: MixConfigDTO
  title?: string
}): Promise<CreateMixedAudioResponse> {
  try {
    const res = (await http.post('/mixed-audios', payload)) as ApiResponse<CreateMixedAudioResponse>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '创建合成任务失败'), { cause: error })
  }
}

export async function createMixPreview(payload: {
  podcast_source_id: string
  bgm_source_id: string
  mix_config: MixConfigDTO
  start_sec?: number
  duration_sec?: number | null
}): Promise<PreviewMixResponseDTO> {
  try {
    const res = (await http.post('/mixed-audios/preview', payload, {
      timeout: 180000,
    })) as ApiResponse<PreviewMixResponseDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '试听生成失败'), { cause: error })
  }
}

export async function getMixTask(mixedAudioId: string): Promise<MixTaskDTO> {
  try {
    const res = (await http.get(`/mixed-audios/${mixedAudioId}/task`, {
      timeout: 60000,
    })) as ApiResponse<MixTaskDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '合成状态查询失败'), { cause: error })
  }
}

export async function regenerateMixedAudio(
  id: string,
  mix_config: MixConfigDTO,
): Promise<CreateMixedAudioResponse> {
  try {
    const res = (await http.post(`/mixed-audios/${id}/regenerate`, {
      mix_config,
    })) as ApiResponse<CreateMixedAudioResponse>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '重新合成失败'), { cause: error })
  }
}

export async function getPlaybackProgress(
  id: string,
  playerContext: PlayerContext,
): Promise<PlaybackProgressDTO | null> {
  try {
    const res = (await http.get(`/mixed-audios/${id}/playback-progress`, {
      params: { player_context: playerContext },
    })) as ApiResponse<PlaybackProgressDTO | null>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '读取播放进度失败'), { cause: error })
  }
}

export async function savePlaybackProgress(
  id: string,
  payload: {
    player_context: PlayerContext
    position_seconds: number
    duration_seconds?: number
  },
): Promise<PlaybackProgressDTO> {
  try {
    const res = (await http.put(`/mixed-audios/${id}/playback-progress`, payload)) as ApiResponse<
      PlaybackProgressDTO
    >
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '保存播放进度失败'), { cause: error })
  }
}
