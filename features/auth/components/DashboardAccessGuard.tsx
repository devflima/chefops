'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/features/auth/hooks/useUser'
import { usePlan } from '@/features/plans/hooks/usePlan'
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
  const { data: planData, isLoading: planLoading } = usePlan()
  const plan = (planData?.plan as Plan | null | undefined) ?? null
  const permissionsLoading = loading || (!!user && planLoading)

  const canAccess = canAccessDashboardPath(user?.profile.role, pathname, plan)

  useEffect(() => {
    if (!permissionsLoading && !canAccess) {
      router.replace('/dashboard')
    }
  }, [canAccess, permissionsLoading, router])

  if (permissionsLoading) {
    return <div className="p-8 text-sm text-slate-400">Carregando permissões...</div>
  }

  if (!canAccess) {
    return <div className="p-8 text-sm text-slate-400">Redirecionando...</div>
  }

  return <>{children}</>
}
