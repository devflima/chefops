'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePlan } from '@/features/plans/hooks/usePlan'
import { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES } from '@/features/plans/types'
import type { Plan } from '@/features/plans/types'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PlanosPage() {
  const searchParams = useSearchParams()
  const { data: currentPlan } = usePlan()
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<{
    status: string
    plan: 'basic' | 'pro'
    next_payment_date: string | null
  } | null>(null)

  const plans: Plan[] = ['free', 'basic', 'pro']

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((res) => res.json())
      .then((json) => setCurrentSubscription(json.data ?? null))
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (searchParams.get('billing') === 'return') {
      alert('Retorno da assinatura recebido. Assim que o Mercado Pago confirmar, o plano será atualizado automaticamente.')
    }
  }, [searchParams])

  async function handleSubscribe(plan: 'basic' | 'pro') {
    try {
      setLoadingPlan(plan)
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)
      if (!json.data?.checkout_url) {
        throw new Error('O Mercado Pago não retornou um link de assinatura.')
      }

      window.location.href = json.data.checkout_url
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao iniciar assinatura.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Planos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Seu plano atual:{' '}
          <span className="font-medium text-slate-900">
            {PLAN_LABELS[currentPlan?.plan ?? 'free']}
          </span>
        </p>
        {currentSubscription && (
          <p className="mt-2 text-sm text-slate-500">
            Assinatura atual: <span className="font-medium text-slate-900">{PLAN_LABELS[currentSubscription.plan]}</span>{' '}
            · status <span className="font-medium capitalize text-slate-900">{currentSubscription.status}</span>
            {currentSubscription.next_payment_date && (
              <>
                {' '}· próxima cobrança em{' '}
                <span className="font-medium text-slate-900">
                  {new Date(currentSubscription.next_payment_date).toLocaleDateString('pt-BR')}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.plan === plan
          const isPopular = plan === 'basic'

          return (
            <div
              key={plan}
              className={`relative bg-white rounded-xl border-2 p-6 flex flex-col ${
                isPopular
                  ? 'border-slate-900'
                  : isCurrent
                  ? 'border-blue-200'
                  : 'border-slate-200'
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Mais popular
                </span>
              )}

              {isCurrent && !isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Plano atual
                </span>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {PLAN_LABELS[plan]}
                </h2>
                <div className="mt-2 flex items-baseline gap-1">
                  {PLAN_PRICES[plan] === 0 ? (
                    <span className="text-3xl font-bold text-slate-900">Grátis</span>
                  ) : (
                    <>
                      <span className="text-sm text-slate-500">R$</span>
                      <span className="text-3xl font-bold text-slate-900">
                        {PLAN_PRICES[plan]}
                      </span>
                      <span className="text-sm text-slate-500">/mês</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {PLAN_FEATURES[plan].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  Plano atual
                </Button>
              ) : plan === 'free' ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => alert('Downgrade para o plano Basic será tratado manualmente neste primeiro momento.')}
                >
                  Usar Basic
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  disabled={loadingPlan === plan}
                  onClick={() => handleSubscribe(plan)}
                >
                  {loadingPlan === plan ? 'Redirecionando...' : 'Assinar agora'}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-medium text-slate-900 mb-1">Precisa de ajuda para escolher?</h3>
        <p className="text-sm text-slate-500">
          Entre em contato pelo email{' '}
          <a href="mailto:suporte@chefops.com.br" className="text-slate-900 underline underline-offset-4">
            suporte@chefops.com.br
          </a>{' '}
          e nossa equipe te ajuda a encontrar o melhor plano para o seu negócio.
        </p>
      </div>
    </div>
  )
}
