import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import PaymentPage from '@/pages/PaymentPage'
import PaymentStatus from '@/pages/PaymentStatus'
import RegisterVenue from '@/pages/RegisterVenue'

const StaffDashboard = lazy(() => import('@/pages/StaffDashboard'))
const ManagerDashboard = lazy(() => import('@/pages/ManagerDashboard'))
const ManagerStaff = lazy(() => import('@/pages/ManagerStaff'))
const ManagerQr = lazy(() => import('@/pages/ManagerQr'))
const Admin = lazy(() => import('@/pages/Admin'))

export default function App() {
  const { pathname, search } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground" role="status">Загружаем кабинет…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/p/:qrToken" element={<PaymentPage />} />
          <Route path="/pay" element={<PaymentPage />} />
          <Route path="/pay/:paymentId/status" element={<PaymentStatus />} />
          <Route path="/login" element={<Login key={search} />} />
          <Route path="/register" element={<RegisterVenue />} />
          <Route path="/staff" element={<ProtectedRoute role="staff"><StaffDashboard /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/manager/staff" element={<ProtectedRoute role="manager"><ManagerStaff /></ProtectedRoute>} />
          <Route path="/manager/qr" element={<ProtectedRoute role="manager"><ManagerQr /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" richColors closeButton toastOptions={{ className: 'font-[Manrope]' }} />
    </ErrorBoundary>
  )
}
