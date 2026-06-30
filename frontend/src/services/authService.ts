import axios from 'axios'
import http from './http'
import type {
  ApiResponse,
  AuthSessionDTO,
  ChangePasswordPayload,
  ChangePasswordResultDTO,
  LoginPayload,
  RegisterPayload,
  UserDTO,
} from '@/types/api'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function assertOk<T>(res: ApiResponse<T>, fallback: string): T {
  if (res.code !== 200) {
    throw new Error(res.message || fallback)
  }
  return res.data
}

export async function register(payload: RegisterPayload): Promise<AuthSessionDTO> {
  try {
    const res = (await http.post('/auth/register', payload)) as ApiResponse<AuthSessionDTO>
    return assertOk(res, '注册失败')
  } catch (error) {
    throw new Error(extractErrorMessage(error, '注册失败'), { cause: error })
  }
}

export async function login(payload: LoginPayload): Promise<AuthSessionDTO> {
  try {
    const res = (await http.post('/auth/login', payload)) as ApiResponse<AuthSessionDTO>
    return assertOk(res, '登录失败')
  } catch (error) {
    throw new Error(extractErrorMessage(error, '登录失败'), { cause: error })
  }
}

export async function logout(): Promise<void> {
  try {
    const res = (await http.post('/auth/logout')) as ApiResponse<{ logged_out: boolean }>
    assertOk(res, '登出失败')
  } catch (error) {
    throw new Error(extractErrorMessage(error, '登出失败'), { cause: error })
  }
}

export async function fetchMe(): Promise<UserDTO | null> {
  try {
    const res = (await http.get('/auth/me')) as ApiResponse<UserDTO>
    return assertOk(res, '获取用户信息失败')
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    throw error
  }
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResultDTO> {
  try {
    const res = (await http.post('/auth/change-password', payload)) as ApiResponse<
      ChangePasswordResultDTO
    >
    return assertOk(res, '修改密码失败')
  } catch (error) {
    throw new Error(extractErrorMessage(error, '修改密码失败'), { cause: error })
  }
}
