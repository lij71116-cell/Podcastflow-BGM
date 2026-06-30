import { useEffect } from 'react'
import { AppRouter } from './router'
import { setupMock } from './mocks'
import { useAuthStore } from './stores/authStore'

if (import.meta.env.VITE_USE_MOCK === 'true') {
  setupMock()
}

function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return <AppRouter />
}

export default App
