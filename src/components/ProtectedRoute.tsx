import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useDemoState } from '@/lib/store'
import type { Role } from '@/types'

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useDemoState()
  const location = useLocation()
  if (session?.role !== role) return <Navigate to="/login" replace state={{ from: location.pathname, role }} />
  return children
}
