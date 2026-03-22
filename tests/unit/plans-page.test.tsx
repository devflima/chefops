import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useSearchParamsMock = vi.fn()
const usePlanMock = vi.fn()

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return { Check: Icon }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
}))

describe('plans page helpers and components', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.doUnmock('react')
    vi.resetModules()
  })

  it('resolve estados de card para plano atual, assinatura paga e loading', async () => {
    const plansPage = await import('@/features/plans/plans-page')

    expect(
      plansPage.getPlanCardState({
        plan: 'basic',
        currentPlan: 'basic',
        currentSubscription: null,
        loadingPlan: null,
      })
    ).toMatchObject({
      badge: 'Mais popular',
      buttonLabel: 'Plano atual',
      disabled: true,
    })

    expect(
      plansPage.getPlanCardState({
        plan: 'pro',
        currentPlan: 'basic',
        currentSubscription: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-20T00:00:00.000Z',
        },
        loadingPlan: null,
      })
    ).toMatchObject({
      buttonLabel: 'Trocar no próximo ciclo',
      disabled: false,
    })

    expect(
      plansPage.getPlanCardState({
        plan: 'pro',
        currentPlan: 'free',
        currentSubscription: null,
        loadingPlan: 'pro',
      })
    ).toMatchObject({
      buttonLabel: 'Redirecionando...',
      disabled: true,
    })
  })

  it('monta resumos de assinatura, cancelamento e agendamento', async () => {
    const plansPage = await import('@/features/plans/plans-page')

    const subscription = {
      status: 'authorized',
      plan: 'pro' as const,
      next_payment_date: '2026-04-21T00:00:00.000Z',
      cancel_at_period_end: true,
      scheduled_plan: 'basic' as const,
    }

    expect(plansPage.getSubscriptionSummary(subscription)).toContain('Assinatura atual: Premium')
    expect(plansPage.getSubscriptionSummary(subscription)).toContain('próxima cobrança em')
    expect(plansPage.getCancellationSummary(subscription)).toContain('Renovação cancelada')
    expect(plansPage.getScheduledPlanSummary(subscription)).toContain('Mudança programada para Standard')
    expect(plansPage.getPlanPriceLabel('free')).toBe('Grátis')
    expect(plansPage.getPlanPriceLabel('basic')).toBe('R$ 89/mês')
    expect(plansPage.isPaidSubscriptionActive(subscription)).toBe(true)
  })

  it('renderiza resumo, card e painel de ajuda', async () => {
    const { PlanSubscriptionSummary } = await import('@/features/plans/components/PlanSubscriptionSummary')
    const { PlanCard } = await import('@/features/plans/components/PlanCard')
    const { PlanHelpPanel } = await import('@/features/plans/components/PlanHelpPanel')
    const onSelect = vi.fn()

    const summaryMarkup = renderToStaticMarkup(
      React.createElement(PlanSubscriptionSummary, {
        currentPlan: 'basic',
        currentSubscription: {
          status: 'pending',
          plan: 'basic',
          next_payment_date: '2026-04-21T00:00:00.000Z',
          scheduled_plan: 'pro',
        },
      })
    )

    const cardMarkup = renderToStaticMarkup(
      React.createElement(PlanCard, {
        plan: 'pro',
        currentPlan: 'basic',
        currentSubscription: null,
        loadingPlan: null,
        onSelect,
      })
    )

    const popularCardMarkup = renderToStaticMarkup(
      React.createElement(PlanCard, {
        plan: 'basic',
        currentPlan: 'free',
        currentSubscription: null,
        loadingPlan: null,
        onSelect,
      })
    )

    const freeCardTree = React.createElement(PlanCard, {
      plan: 'free',
      currentPlan: 'free',
      currentSubscription: null,
      loadingPlan: null,
      onSelect,
    })

    const helpMarkup = renderToStaticMarkup(React.createElement(PlanHelpPanel))

    expect(summaryMarkup).toContain('Seu plano atual:')
    expect(summaryMarkup).toContain('Assinatura atual:')
    expect(summaryMarkup).toContain('Mudança programada para Premium')
    expect(cardMarkup).toContain('Premium')
    expect(cardMarkup).toContain('Assinar agora')
    expect(cardMarkup).toContain('White-label')
    expect(popularCardMarkup).toContain('Mais popular')
    expect(renderToStaticMarkup(freeCardTree)).toContain('Plano atual')
    expect(helpMarkup).toContain('Precisa de ajuda para escolher?')
    expect(helpMarkup).toContain('suporte@chefops.com.br')

    const cardButtons = renderToStaticMarkup(freeCardTree)
    expect(cardButtons).toContain('Plano atual')

    const node = freeCardTree
    const walk = (input: React.ReactNode): React.ReactElement[] => {
      if (input == null || typeof input === 'boolean' || typeof input === 'string' || typeof input === 'number') return []
      if (Array.isArray(input)) return input.flatMap(walk)
      if (!React.isValidElement(input)) return []
      if (typeof input.type === 'function') return walk(input.type(input.props))
      return [input, ...walk(input.props.children)]
    }
    const buttons = walk(node).filter((element) => element.type === 'button')
    buttons[0]?.props.onClick()
    expect(onSelect).toHaveBeenCalledWith('free')
  })

  it('resolve alerta de retorno e operações de assinatura', async () => {
    const plansPage = await import('@/features/plans/plans-page')

    expect(
      plansPage.getBillingReturnAlertMessage({
        get: (key: string) => (key === 'billing' ? 'return' : null),
      })
    ).toContain('Retorno da assinatura recebido')

    expect(
      plansPage.getBillingReturnAlertMessage({
        get: () => null,
      })
    ).toBeNull()

    const subscribeFetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: { checkout_url: 'https://mp.example/checkout/pro' } }))
    )
    await expect(plansPage.createPlanSubscription('pro', subscribeFetch)).resolves.toBe('https://mp.example/checkout/pro')

    const cancelFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        data: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-21T00:00:00.000Z',
          cancel_at_period_end: true,
        },
      }))
    )
    await expect(plansPage.cancelPlanSubscription(cancelFetch)).resolves.toMatchObject({
      subscription: {
        cancel_at_period_end: true,
      },
      message: 'Renovação cancelada com sucesso. Seu plano continuará ativo até o vencimento atual.',
    })

    const scheduleFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        data: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-21T00:00:00.000Z',
          scheduled_plan: 'pro',
        },
      }))
    )
    await expect(plansPage.schedulePlanSubscriptionChange('pro', scheduleFetch)).resolves.toMatchObject({
      subscription: {
        scheduled_plan: 'pro',
      },
      message: 'Mudança programada com sucesso. O plano Premium entra na próxima renovação.',
    })
  })

  it('renderiza página de planos com retorno do billing e assinatura ativa', async () => {
    const alertMock = vi.fn()
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        data: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-21T00:00:00.000Z',
          cancel_at_period_end: false,
        },
      }))
    )

    useSearchParamsMock.mockReturnValue({
      get: vi.fn((key: string) => (key === 'billing' ? 'return' : null)),
    })
    usePlanMock.mockReturnValue({
      data: { plan: 'basic' },
    })

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'alert', {
      value: alertMock,
      configurable: true,
    })

    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      let stateCall = 0

      return {
        ...actualReact,
        useEffect: (callback: () => void | (() => void)) => {
          callback()
        },
        useState: (initialValue: unknown) => {
          stateCall += 1

          if (stateCall === 1) {
            return [null, vi.fn()]
          }

          if (stateCall === 2) {
            return [
              {
                status: 'authorized',
                plan: 'basic',
                next_payment_date: '2026-04-21T00:00:00.000Z',
                cancel_at_period_end: false,
              },
              vi.fn(),
            ]
          }

          return [initialValue, vi.fn()]
        },
      }
    })

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    const markup = renderToStaticMarkup(React.createElement(PlanosPage))

    expect(markup).toContain('Planos')
    expect(markup).toContain('Seu plano atual:')
    expect(markup).toContain('Standard')
    expect(markup).toContain('Plano atual')
    expect(fetchMock).toHaveBeenCalledWith('/api/billing/subscription')
  })
})
