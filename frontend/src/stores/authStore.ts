import { create } from 'zustand'
import * as authService from '@/services/authService'
import type { UserDTO } from '@/types/api'

export type AuthUser = Pick<UserDTO, 'id' | 'username' | 'email' | 'display_name'>

interface AuthState {
  user: AuthUser | null
  initialized: boolean
  bootstrap: () => Promise<void>
  login: (payload: { mode: 'username' | 'email'; identifier: string; password: string }) => Promise<void>
  register: (payload: {
    username: string
    email: string
    password: string
    password_confirm: string
  }) => Promise<void>
  logout: () => Promise<void>
  changePassword: (payload: {
    current_password: string
    new_password: string
    new_password_confirm: string
  }) => Promise<void>
  clearUser: () => void
  mockLogin: (payload?: Partial<Pick<AuthUser, 'username' | 'email'>>) => void
  mockRegister: (payload: { username: string; email: string }) => void
}

const DEFAULT_MOCK_USER: AuthUser = {
  id: 'mock-user-001',
  username: 'focus_listener',
  email: 'demo@example.com',
  display_name: 'focus_listener',
}

const isMockAuthMode = () => import.meta.env.VITE_USE_MOCK === 'true'

function mapUser(user: UserDTO): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  bootstrap: async () => {
    if (isMockAuthMode()) {
      set({ initialized: true })
      return
    }
    try {
      const user = await authService.fetchMe()
      set({ user: user ? mapUser(user) : null, initialized: true })
    } catch {
      set({ user: null, initialized: true })
    }
  },

  login: async ({ mode, identifier, password }) => {
    if (isMockAuthMode()) {
      set({
        user: {
          ...DEFAULT_MOCK_USER,
          username: mode === 'username' ? identifier.trim() : DEFAULT_MOCK_USER.username,
          email: mode === 'email' ? identifier.trim() : DEFAULT_MOCK_USER.email,
          display_name: mode === 'username' ? identifier.trim() : DEFAULT_MOCK_USER.display_name,
        },
      })
      return
    }
    const data = await authService.login({
      mode,
      username: mode === 'username' ? identifier : undefined,
      email: mode === 'email' ? identifier : undefined,
      password,
    })
    set({ user: mapUser(data.user) })
  },

  register: async (payload) => {
    if (isMockAuthMode()) {
      set({
        user: {
          id: `mock-user-${Date.now()}`,
          username: payload.username.trim(),
          email: payload.email.trim(),
          display_name: payload.username.trim(),
        },
      })
      return
    }
    const data = await authService.register(payload)
    set({ user: mapUser(data.user) })
  },

  logout: async () => {
    if (!isMockAuthMode()) {
      try {
        await authService.logout()
      } catch {
        // 仍清本地态，避免登出卡死
      }
    }
    set({ user: null })
  },

  changePassword: async (payload) => {
    if (isMockAuthMode()) {
      throw new Error('Mock 模式下请使用真实后端测试修改密码')
    }
    await authService.changePassword(payload)
  },

  clearUser: () => set({ user: null }),

  mockLogin: (payload) =>
    set({
      user: {
        ...DEFAULT_MOCK_USER,
        username: payload?.username?.trim() || DEFAULT_MOCK_USER.username,
        email: payload?.email?.trim() || DEFAULT_MOCK_USER.email,
        display_name: payload?.username?.trim() || DEFAULT_MOCK_USER.display_name,
      },
    }),

  mockRegister: ({ username, email }) =>
    set({
      user: {
        id: `mock-user-${Date.now()}`,
        username: username.trim(),
        email: email.trim(),
        display_name: username.trim(),
      },
    }),
}))

export function getUserInitial(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}
