import axios from 'axios'
import type { ApiResponse } from '@/types/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  withCredentials: true,
})

http.interceptors.response.use(
  (response) => response.data as ApiResponse<unknown> as never,
  (error) => {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as ApiResponse<null> | undefined
      if (body?.message) {
        return Promise.reject(new Error(body.message))
      }
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('请求超时，请稍后重试'))
      }
      if (error.message === 'Network Error') {
        return Promise.reject(new Error('网络连接失败，请检查网络后重试'))
      }
    }
    return Promise.reject(error)
  },
)

export default http
