import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { getUserInitial, useAuthStore } from '@/stores/authStore'
import './AppHeader.css'

export function AppHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const mockLogin = useAuthStore((s) => s.mockLogin)
  const logout = useAuthStore((s) => s.logout)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'

  const menuItems: MenuProps['items'] = [
    {
      key: 'password',
      label: '修改密码',
      onClick: () => {
        if (useMock) {
          message.info('Mock 模式下修改密码需切换 VITE_USE_MOCK=false 并登录真实账号')
          return
        }
        setPasswordModalOpen(true)
      },
    },
    {
      key: 'logout',
      label: '退出登录',
      onClick: () => {
        void (async () => {
          await logout()
          message.success('已退出登录')
          navigate('/auth')
        })()
      },
    },
  ]

  return (
    <>
      <header className="app-header create-topnav">
        <div className="app-header__left">
          <Link to="/" className="app-logo">
            Podcast Flow
          </Link>
        </div>

        {user ? (
          <nav className="app-nav" aria-label="主导航">
            <Link to="/" className={pathname === '/' ? 'active' : ''}>
              创建
            </Link>
            <Link to="/library" className={pathname.startsWith('/library') ? 'active' : ''}>
              我的音频库
            </Link>
          </nav>
        ) : (
          <div className="app-nav app-nav--placeholder" aria-hidden="true" />
        )}

        <div className="app-header__right">
          {user ? (
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <button type="button" className="app-user-trigger">
                <span className="app-user-avatar">{getUserInitial(user.username)}</span>
                <span className="app-user-name">{user.username}</span>
              </button>
            </Dropdown>
          ) : (
            <div className="app-auth-actions">
              <Link to="/auth" className="app-auth-link">
                登录
              </Link>
              <Link to="/auth?tab=register" className="app-auth-btn">
                注册
              </Link>
              {useMock && (
                <button type="button" className="app-mock-login" onClick={() => mockLogin()} title="Mock 登录态">
                  Mock 登录
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  )
}
