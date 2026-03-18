'use client'

import { usePlan } from '@/features/plans/hooks/usePlan'
import { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES } from '@/features/plans/types'
import type { Plan } from '@/features/plans/types'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PlanosPage() {
  const { data: currentPlan } = usePlan()

  const plans: Plan[] = ['free', 'basic', 'pro']

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
              ) : (
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => alert('Integração com Mercado Pago em breve!')}
                >
                  {PLAN_PRICES[plan] === 0 ? 'Usar grátis' : 'Assinar agora'}
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