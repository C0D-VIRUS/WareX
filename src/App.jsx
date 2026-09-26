import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './components/auth/LoginPage'
import AppShell from './components/layout/AppShell'
import { WarexProvider, useWarex } from './context/WarexContext'

function AppRoutes() {
  const { session } = useWarex()
  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to={`/${session.roleId}`} replace /> : <LoginPage />} />
      <Route path="/:roleId/*" element={session ? <AppShell session={session} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <WarexProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </WarexProvider>
  )
}
