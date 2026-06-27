import axios from 'axios'
import type { ApiResponse } from '@/types/api'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 30000,
  withCredentials: true,
})

http.interceptors.response.use((response) => {
  return response.data as ApiResponse<unknown> as never
})

export default http
