'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/features/auth/hooks/useUser'
import { canAccessDashboardPath } from '@/lib/rbac'
import type { Plan } from '@/features/plans/types'

export default function DashboardAccessGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useUser()
  const plan = (user?.profile.tenant?.plan as Plan | null | undefined) ?? null

  const canAccess = canAccessDashboardPath(user?.profile.role, pathname, plan)

  useEffect(() => {
    if (!loading && !canAccess) {
      router.replace('/dashboard')
    }
  }, [canAccess, loading, router])

  if (loading) {
    return <div className="p-8 text-sm text-slate-400">Carregando permissões...</div>
  }

  if (!canAccess) {
    return <div className="p-8 text-sm text-slate-400">Redirecionando...</div>
  }

  return <>{children}</>
}
