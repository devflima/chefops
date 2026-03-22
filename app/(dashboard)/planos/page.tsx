'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePlan } from '@/features/plans/hooks/usePlan'
import type { Plan } from '@/features/plans/types'
import { PlanosPageContent } from '@/features/plans/components/PlanosPageContent'
import {
  cancelPlanSubscription,
  createPlanSubscription,
  getBillingReturnAlertMessage,
  isPaidSubscriptionActive,
  schedulePlanSubscriptionChange,
} from '@/features/plans/plans-page'

export default function PlanosPage() {
  const searchParams = useSearchParams()
  const { data: currentPlan } = usePlan()
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<{
    status: string
    plan: 'basic' | 'pro'
    next_payment_date: string | null
    cancel_at_period_end?: boolean
    scheduled_plan?: 'basic' | 'pro' | null
  } | null>(null)

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((res) => res.json())
      .then((json) => setCurrentSubscription(json.data ?? null))
      .catch(() => null)
  }, [])

  useEffect(() => {
    const alertMessage = getBillingReturnAlertMessage(searchParams)
    if (alertMessage) alert(alertMessage)
  }, [searchParams])

  async function handleSubscribe(plan: 'basic' | 'pro') {
    try {
      setLoadingPlan(plan)
      window.location.href = await createPlanSubscription(plan)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao iniciar assinatura.')
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handleCancelSubscription() {
    if (!window.confirm('Cancelar a renovação da assinatura? Você continuará com acesso até a próxima cobrança.')) {
      return
    }

    try {
      const result = await cancelPlanSubscription()
      setCurrentSubscription(result.subscription)
      alert(result.message)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao cancelar assinatura.')
    }
  }

  async function handleSchedulePlanChange(plan: 'basic' | 'pro') {
    try {
      const result = await schedulePlanSubscriptionChange(plan)
      setCurrentSubscription(result.subscription)
      alert(result.message)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao programar troca de plano.')
    }
  }

  return (
    <PlanosPageContent
      currentPlan={currentPlan?.plan}
      currentSubscription={currentSubscription}
      loadingPlan={loadingPlan}
      onSelectPlan={(selectedPlan) => {
        if (selectedPlan === 'free') {
          alert('Downgrade para o plano Basic será tratado manualmente neste primeiro momento.')
          return
        }

        if (isPaidSubscriptionActive(currentSubscription)) {
          void handleSchedulePlanChange(selectedPlan)
          return
        }

        void handleSubscribe(selectedPlan)
      }}
      onCancelSubscription={handleCancelSubscription}
    />
  )
}
