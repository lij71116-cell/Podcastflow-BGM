import { Link, useLocation } from 'react-router-dom'
import './AppHeader.css'

export function AppHeader() {
  const { pathname } = useLocation()

  return (
    <header className="app-header">
      <Link to="/" className="app-logo">
        Podcast Flow
      </Link>
      <nav className="app-nav">
        <Link to="/" className={pathname === '/' ? 'active' : ''}>
          创建
        </Link>
        <Link to="/library" className={pathname.startsWith('/library') ? 'active' : ''}>
          我的音频库
        </Link>
      </nav>
    </header>
  )
}
