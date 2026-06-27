import { AppRouter } from './router'
import { setupMock } from './mocks'

if (import.meta.env.VITE_USE_MOCK === 'true') {
  setupMock()
}

function App() {
  return <AppRouter />
}

export default App
