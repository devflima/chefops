'use client'

import { useHasFeature } from '../hooks/usePlan'
import type { PlanFeature } from '../types'
import { Lock } from 'lucide-react'
import Link from 'next/link'

type Props = {
  feature: PlanFeature
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function FeatureGate({ feature, children, fallback }: Props) {
  const hasFeature = useHasFeature(feature)

  if (hasFeature) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-slate-900 font-medium mb-1">Recurso não disponível</h3>
      <p className="text-slate-500 text-sm mb-4">
        Esta funcionalidade não está disponível no seu plano atual.
      </p>
      <Link
        href="/planos"
        className="text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        Ver planos disponíveis
      </Link>
    </div>
  )
}