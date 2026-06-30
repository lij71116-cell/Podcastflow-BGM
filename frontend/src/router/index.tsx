import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { GlobalPlayerBar } from '@/components/GlobalPlayerBar'
import { GuestAuthRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import { PwaInstallBar } from '@/components/PwaInstallBar'
import CreatePage from '@/pages/CreatePage'
import DetailPage from '@/pages/DetailPage'
import LibraryPage from '@/pages/LibraryPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<GuestAuthRoute />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<CreatePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/detail/:id" element={<DetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalPlayerBar />
      <PwaInstallBar />
    </BrowserRouter>
  )
}
