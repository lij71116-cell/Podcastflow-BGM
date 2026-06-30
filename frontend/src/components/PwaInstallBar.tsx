import { useEffect, useState } from 'react'
import { isStandalonePwa } from '@/pwa/registerServiceWorker'
import { usePlayerStore } from '@/stores/playerStore'
import './PwaInstallBar.css'

const PWA_DISMISS_KEY = 'pwa_dismissed'

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 1023px)').matches
}

export function PwaInstallBar() {
  const playerVisible = usePlayerStore((s) => s.visible)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const syncVisibility = () => {
      const dismissed = sessionStorage.getItem(PWA_DISMISS_KEY) === '1'
      setVisible(isMobileViewport() && !dismissed && !isStandalonePwa())
    }

    syncVisibility()
    const media = window.matchMedia('(max-width: 1023px)')
    media.addEventListener('change', syncVisibility)
    return () => media.removeEventListener('change', syncVisibility)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('has-pwa-bar', visible)
    return () => document.body.classList.remove('has-pwa-bar')
  }, [visible])

  const dismiss = () => {
    sessionStorage.setItem(PWA_DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className={`pwa-bar visible${playerVisible ? ' pwa-bar--above-player' : ''}`}
      role="note"
      aria-label="添加到主屏幕引导"
    >
      <span>添加到主屏幕，像 App 一样打开 Podcast Flow</span>
      <button type="button" className="pwa-dismiss" onClick={dismiss}>
        关闭
      </button>
    </div>
  )
}
