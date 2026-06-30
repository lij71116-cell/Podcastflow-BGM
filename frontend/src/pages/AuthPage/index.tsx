import { useMemo, useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import './AuthPage.css'

type AuthTab = 'login' | 'register'
type LoginMode = 'username' | 'email'

interface LoginFormValues {
  identifier: string
  password: string
}

interface RegisterFormValues {
  username: string
  email: string
  password: string
  password_confirm: string
}

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login'
  const [tab, setTab] = useState<AuthTab>(initialTab)
  const [loginMode, setLoginMode] = useState<LoginMode>('username')
  const [submitting, setSubmitting] = useState(false)

  const [loginForm] = Form.useForm<LoginFormValues>()
  const [registerForm] = Form.useForm<RegisterFormValues>()

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from
    return from && from !== '/auth' ? from : '/'
  }, [location.state])

  const headerCopy = useMemo(() => {
    if (tab === 'register') {
      return { title: '创建账号', subtitle: '注册后可在多端同步你的组合音频库' }
    }
    return {
      title: '欢迎回来',
      subtitle: loginMode === 'username' ? '使用用户名或邮箱登录' : '使用邮箱登录',
    }
  }, [tab, loginMode])

  const switchTab = (next: AuthTab) => {
    setTab(next)
    setSearchParams(next === 'register' ? { tab: 'register' } : {}, { replace: true })
  }

  const handleLogin = async (values: LoginFormValues) => {
    setSubmitting(true)
    try {
      await login({
        mode: loginMode,
        identifier: values.identifier,
        password: values.password,
      })
      message.success('登录成功')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (values: RegisterFormValues) => {
    if (values.password !== values.password_confirm) {
      message.error('两次输入的密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await register(values)
      message.success('注册成功，已自动登录')
      navigate('/', { replace: true })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          <span className="auth-brand-logo-dot" />
          Podcast Flow
        </div>
        <div className="auth-brand-copy">
          <h1>
            为小宇宙播客
            <br />
            叠加你的专注 BGM
          </h1>
          <p>无缝同步你的音频库，沉浸在专注与灵感的混音流中。现代温暖，纯粹聆听。</p>
        </div>
        <div className="auth-brand-waves" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-mobile-logo">
          <span className="auth-mobile-logo-dot" />
          Podcast Flow
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{headerCopy.title}</h2>
            <p>{headerCopy.subtitle}</p>
          </div>

          {tab === 'login' ? (
            <>
              <div className="auth-segmented" role="tablist">
                <button
                  type="button"
                  className={loginMode === 'username' ? 'active' : ''}
                  onClick={() => setLoginMode('username')}
                >
                  用户名登录
                </button>
                <button
                  type="button"
                  className={loginMode === 'email' ? 'active' : ''}
                  onClick={() => setLoginMode('email')}
                >
                  邮箱登录
                </button>
              </div>

              <Form
                form={loginForm}
                layout="vertical"
                className="auth-form"
                onFinish={handleLogin}
                requiredMark={false}
              >
                <Form.Item
                  label={loginMode === 'username' ? '用户名' : '邮箱'}
                  name="identifier"
                  rules={[
                    { required: true, message: loginMode === 'username' ? '请输入用户名' : '请输入邮箱' },
                    loginMode === 'email'
                      ? { type: 'email', message: '请输入有效邮箱' }
                      : { min: 3, message: '用户名至少 3 个字符' },
                  ]}
                >
                  <Input
                    placeholder={loginMode === 'username' ? '输入您的用户名' : 'name@example.com'}
                    autoComplete={loginMode === 'username' ? 'username' : 'email'}
                  />
                </Form.Item>
                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 8, message: '密码至少 8 位' },
                  ]}
                >
                  <Input.Password placeholder="输入密码" autoComplete="current-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" className="auth-submit" loading={submitting}>
                  登录
                </Button>
              </Form>

              <div className="auth-switch">
                还没有账号？
                <button type="button" onClick={() => switchTab('register')}>
                  立即注册
                </button>
              </div>
            </>
          ) : (
            <>
              <Form
                form={registerForm}
                layout="vertical"
                className="auth-form"
                onFinish={handleRegister}
                requiredMark={false}
              >
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { min: 3, max: 32, message: '用户名长度 3–32 字符' },
                  ]}
                >
                  <Input placeholder="自创用户名" autoComplete="username" />
                </Form.Item>
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入有效邮箱' },
                  ]}
                >
                  <Input placeholder="name@example.com" autoComplete="email" />
                </Form.Item>
                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 8, message: '密码至少 8 位' },
                  ]}
                >
                  <Input.Password placeholder="至少 8 位" autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  label="确认密码"
                  name="password_confirm"
                  rules={[{ required: true, message: '请再次输入密码' }]}
                >
                  <Input.Password placeholder="再次输入密码" autoComplete="new-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" className="auth-submit" loading={submitting}>
                  注册
                </Button>
              </Form>

              <div className="auth-switch">
                已有账号？
                <button type="button" onClick={() => switchTab('login')}>
                  去登录
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
