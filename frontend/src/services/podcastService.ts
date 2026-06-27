import axios from 'axios'
import http from './http'
import type { ApiResponse, PodcastSourceDTO } from '@/types/api'

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<null> | undefined
    if (body?.message) return body.message
  }
  if (error instanceof Error) return error.message
  return '播客解析失败'
}

export async function parsePodcast(sourceUrl: string): Promise<PodcastSourceDTO> {
  try {
    const res = (await http.post('/podcasts/parse', {
      source_url: sourceUrl,
    })) as ApiResponse<PodcastSourceDTO>
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return res.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}
