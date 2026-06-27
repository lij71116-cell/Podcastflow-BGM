import axios from 'axios'
import http from './http'
import type {
  ApiResponse,
  CreateMixedAudioResponse,
  MixConfigDTO,
  MixedAudioAssetDTO,
  MixedAudioListResponse,
  MixTaskDTO,
} from '@/types/api'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<null> | undefined
    if (body?.message) return body.message
  }
  if (error instanceof Error) return error.message
  return fallback
}

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

export async function listMixedAudios(): Promise<MixedAudioListResponse> {
  try {
    const res = (await http.get('/mixed-audios')) as ApiResponse<MixedAudioListResponse>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
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
