import axios from 'axios'
import http from './http'
import type { ApiResponse, BgmSourceDTO } from '@/types/api'

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<null> | undefined
    if (body?.message) return body.message
  }
  if (error instanceof Error) return error.message
  return 'BGM 不可用'
}

export async function uploadBgm(file: File): Promise<BgmSourceDTO> {
  const form = new FormData()
  form.append('file', file)
  try {
    const res = (await http.post('/bgm/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })) as ApiResponse<BgmSourceDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}

export async function validateBgmUrl(sourceUrl: string): Promise<BgmSourceDTO> {
  try {
    const res = (await http.post('/bgm/validate-url', {
      source_url: sourceUrl,
    })) as ApiResponse<BgmSourceDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}

export async function validateQishuiShare(shareUrl: string): Promise<BgmSourceDTO> {
  try {
    const res = (await http.post('/bgm/validate-qishui', {
      share_url: shareUrl,
    })) as ApiResponse<BgmSourceDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}
