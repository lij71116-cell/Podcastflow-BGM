import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import AuthPage from '@/pages/AuthPage'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const location = useLocation()
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'

  if (useMock) {
    return <Outlet />
  }

  if (!initialized) {
    return (
      <div className="auth-route-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function GuestAuthRoute() {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'

  if (useMock) {
    return <AuthPage />
  }

  if (!initialized) {
    return (
      <div className="auth-route-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <AuthPage />
}
