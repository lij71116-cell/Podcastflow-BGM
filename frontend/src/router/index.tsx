import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GlobalPlayerBar } from '@/components/GlobalPlayerBar'
import CreatePage from '@/pages/CreatePage'
import DetailPage from '@/pages/DetailPage'
import LibraryPage from '@/pages/LibraryPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalPlayerBar />
    </BrowserRouter>
  )
}
