import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useSearchParamsMock = vi.fn()
const usePlanMock = vi.fn()
let reactEffectMode: 'actual' | 'immediate' | 'noop' = 'actual'
let reactStateImpl: ((initialValue: unknown) => [unknown, ReturnType<typeof vi.fn>]) | null = null

vi.mock('react', async () => {
  const actualReact = await vi.importActual<typeof import('react')>('react')

  return {
    ...actualReact,
    useEffect: (callback: () => void | (() => void), deps?: React.DependencyList) => {
      if (reactEffectMode === 'immediate') return callback()
      if (reactEffectMode === 'noop') return undefined
      return actualReact.useEffect(callback, deps)
    },
    useState: (initialValue: unknown) => {
      if (reactStateImpl) return reactStateImpl(initialValue)
      return actualReact.useState(initialValue)
    },
    useMemo: actualReact.useMemo,
    useRef: actualReact.useRef,
  }
})

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
    reactEffectMode = 'actual'
    reactStateImpl = null
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

    expect(
      plansPage.getPlanCardState({
        plan: 'free',
        currentPlan: 'basic',
        currentSubscription: null,
        loadingPlan: null,
      })
    ).toMatchObject({
      badge: null,
      buttonLabel: 'Usar Basic',
      disabled: false,
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
    expect(plansPage.formatPlanDate(null)).toBeNull()
    expect(
      plansPage.getSubscriptionSummary({
        status: 'pending',
        plan: 'basic',
        next_payment_date: null,
      })
    ).toBe('Assinatura atual: Standard · status pending')
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
    const summaryWithoutSubscriptionMarkup = renderToStaticMarkup(
      React.createElement(PlanSubscriptionSummary, {
        currentPlan: 'free',
        currentSubscription: null,
      })
    )
    const summaryWithoutCurrentPlanMarkup = renderToStaticMarkup(
      React.createElement(PlanSubscriptionSummary, {
        currentPlan: null as never,
        currentSubscription: null,
      })
    )
    const summaryWithoutNextPaymentMarkup = renderToStaticMarkup(
      React.createElement(PlanSubscriptionSummary, {
        currentPlan: 'basic',
        currentSubscription: {
          status: 'pending',
          plan: 'basic',
          next_payment_date: null,
        },
      })
    )
    const summaryWithCancellationOnlyMarkup = renderToStaticMarkup(
      React.createElement(PlanSubscriptionSummary, {
        currentPlan: 'basic',
        currentSubscription: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-21T00:00:00.000Z',
          cancel_at_period_end: true,
        },
      })
    )
    const summaryWithScheduledOnlyMarkup = renderToStaticMarkup(
      React.createElement(PlanSubscriptionSummary, {
        currentPlan: 'basic',
        currentSubscription: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-21T00:00:00.000Z',
          scheduled_plan: 'pro',
        },
      })
    )

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
    expect(summaryWithoutSubscriptionMarkup).toContain('Seu plano atual:')
    expect(summaryWithoutSubscriptionMarkup).not.toContain('Assinatura atual:')
    expect(summaryWithoutCurrentPlanMarkup).toContain('Basic')
    expect(summaryWithoutNextPaymentMarkup).toContain('Assinatura atual:')
    expect(summaryWithoutNextPaymentMarkup).not.toContain('próxima cobrança em')
    expect(summaryWithCancellationOnlyMarkup).toContain('Renovação cancelada')
    expect(summaryWithCancellationOnlyMarkup).not.toContain('Mudança programada para')
    expect(summaryWithScheduledOnlyMarkup).toContain('Mudança programada para Premium')
    expect(summaryWithScheduledOnlyMarkup).not.toContain('Renovação cancelada')

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

    const missingCheckoutFetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: {} }))
    )
    await expect(plansPage.createPlanSubscription('basic', missingCheckoutFetch)).rejects.toThrow(
      'O Mercado Pago não retornou um link de assinatura.'
    )

    const subscribeErrorFetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Falha ao criar assinatura.' }), { status: 500 })
    )
    await expect(plansPage.createPlanSubscription('basic', subscribeErrorFetch)).rejects.toThrow(
      'Falha ao criar assinatura.'
    )

    const cancelErrorFetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Falha ao cancelar assinatura.' }), { status: 500 })
    )
    await expect(plansPage.cancelPlanSubscription(cancelErrorFetch)).rejects.toThrow(
      'Falha ao cancelar assinatura.'
    )

    const scheduleErrorFetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Falha ao programar troca.' }), { status: 500 })
    )
    await expect(plansPage.schedulePlanSubscriptionChange('basic', scheduleErrorFetch)).rejects.toThrow(
      'Falha ao programar troca.'
    )
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
    Object.defineProperty(globalThis, 'window', {
      value: { location: { href: '' } },
      configurable: true,
    })

    reactEffectMode = 'immediate'
    let stateCall = 0
    reactStateImpl = (initialValue: unknown) => {
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
    }

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    const markup = renderToStaticMarkup(React.createElement(PlanosPage))

    expect(markup).toContain('Planos')
    expect(markup).toContain('Seu plano atual:')
    expect(markup).toContain('Standard')
    expect(markup).toContain('Plano atual')
  })

  it('tolera erro ao carregar assinatura inicial e alerta no downgrade para free', async () => {
    const alertMock = vi.fn()
    const fetchMock = vi.fn(async () => {
      throw new Error('billing offline')
    })

    useSearchParamsMock.mockReturnValue({
      get: vi.fn(() => null),
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

    let capturedProps: {
      onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void
    } | null = null

    reactEffectMode = 'immediate'

    vi.doMock('@/features/plans/components/PlanosPageContent', () => ({
      PlanosPageContent: (props: { onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void }) => {
        capturedProps = props
        return React.createElement('div', null, 'Planos mock')
      },
    }))

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    const markup = renderToStaticMarkup(React.createElement(PlanosPage))

    expect(markup).toContain('Planos mock')
    expect(fetchMock).toHaveBeenCalledWith('/api/billing/subscription')

    capturedProps?.onSelectPlan('free')

    expect(alertMock).toHaveBeenCalledWith(
      'Downgrade para o plano Basic será tratado manualmente neste primeiro momento.'
    )
  })

  it('programa troca de plano quando a assinatura paga já está ativa', async () => {
    const alertMock = vi.fn()
    const schedulePlanSubscriptionChangeMock = vi.fn(async () => ({
      subscription: {
        status: 'authorized',
        plan: 'basic' as const,
        next_payment_date: '2026-04-21T00:00:00.000Z',
        scheduled_plan: 'pro' as const,
      },
      message: 'Mudança programada com sucesso. O plano Premium entra na próxima renovação.',
    }))
    const createPlanSubscriptionMock = vi.fn()

    useSearchParamsMock.mockReturnValue({
      get: vi.fn(() => null),
    })
    usePlanMock.mockReturnValue({
      data: { plan: 'basic' },
    })

    Object.defineProperty(globalThis, 'alert', {
      value: alertMock,
      configurable: true,
    })

    let capturedProps: {
      onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void
    } | null = null

    reactEffectMode = 'noop'
    let stateCall = 0
    reactStateImpl = (initialValue: unknown) => {
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
    }

    vi.doMock('@/features/plans/components/PlanosPageContent', () => ({
      PlanosPageContent: (props: { onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void }) => {
        capturedProps = props
        return React.createElement('div', null, 'Planos mock')
      },
    }))

    vi.doMock('@/features/plans/plans-page', async () => {
      const actual = await vi.importActual<typeof import('@/features/plans/plans-page')>(
        '@/features/plans/plans-page'
      )
      return {
        ...actual,
        schedulePlanSubscriptionChange: schedulePlanSubscriptionChangeMock,
        createPlanSubscription: createPlanSubscriptionMock,
      }
    })

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPage))

    await capturedProps?.onSelectPlan('pro')

    expect(schedulePlanSubscriptionChangeMock).toHaveBeenCalledWith('pro')
    expect(createPlanSubscriptionMock).not.toHaveBeenCalled()
    expect(alertMock).toHaveBeenCalledWith(
      'Mudança programada com sucesso. O plano Premium entra na próxima renovação.'
    )
  })

  it('usa fallback de erro ao iniciar assinatura e aceita billing sem data', async () => {
    const alertMock = vi.fn()
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({})))
    const createPlanSubscriptionMock = vi.fn(async () => {
      throw 'checkout unavailable'
    })

    useSearchParamsMock.mockReturnValue({
      get: vi.fn(() => null),
    })
    usePlanMock.mockReturnValue({
      data: { plan: 'free' },
    })

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'alert', {
      value: alertMock,
      configurable: true,
    })

    let capturedProps: {
      onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void
    } | null = null

    reactEffectMode = 'immediate'

    vi.doMock('@/features/plans/components/PlanosPageContent', () => ({
      PlanosPageContent: (props: { onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void }) => {
        capturedProps = props
        return React.createElement('div', null, 'Planos mock')
      },
    }))

    vi.doMock('@/features/plans/plans-page', async () => {
      const actual = await vi.importActual<typeof import('@/features/plans/plans-page')>(
        '@/features/plans/plans-page'
      )
      return {
        ...actual,
        createPlanSubscription: createPlanSubscriptionMock,
      }
    })

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPage))

    capturedProps?.onSelectPlan('pro')
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledWith('/api/billing/subscription')
    expect(createPlanSubscriptionMock).toHaveBeenCalledWith('pro')
    expect(alertMock).toHaveBeenCalledWith('Erro ao iniciar assinatura.')
  })

  it('usa fallbacks de erro ao cancelar e programar troca', async () => {
    const alertMock = vi.fn()
    const confirmMock = vi.fn(() => true)
    const cancelPlanSubscriptionMock = vi.fn(async () => {
      throw 'cancel failed'
    })
    const schedulePlanSubscriptionChangeMock = vi.fn(async () => {
      throw 'schedule failed'
    })

    useSearchParamsMock.mockReturnValue({
      get: vi.fn(() => null),
    })
    usePlanMock.mockReturnValue({
      data: { plan: 'basic' },
    })

    Object.defineProperty(globalThis, 'alert', {
      value: alertMock,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: { confirm: confirmMock },
      configurable: true,
    })

    let capturedProps: {
      onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void
      onCancelSubscription: () => Promise<void>
    } | null = null

    reactEffectMode = 'noop'
    let stateCall = 0
    reactStateImpl = (initialValue: unknown) => {
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
    }

    vi.doMock('@/features/plans/components/PlanosPageContent', () => ({
      PlanosPageContent: (props: {
        onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void
        onCancelSubscription: () => Promise<void>
      }) => {
        capturedProps = props
        return React.createElement('div', null, 'Planos mock')
      },
    }))

    vi.doMock('@/features/plans/plans-page', async () => {
      const actual = await vi.importActual<typeof import('@/features/plans/plans-page')>(
        '@/features/plans/plans-page'
      )
      return {
        ...actual,
        cancelPlanSubscription: cancelPlanSubscriptionMock,
        schedulePlanSubscriptionChange: schedulePlanSubscriptionChangeMock,
      }
    })

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPage))

    await capturedProps?.onCancelSubscription()
    capturedProps?.onSelectPlan('pro')
    await Promise.resolve()

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(cancelPlanSubscriptionMock).toHaveBeenCalledTimes(1)
    expect(schedulePlanSubscriptionChangeMock).toHaveBeenCalledWith('pro')
    expect(alertMock).toHaveBeenCalledWith('Erro ao cancelar assinatura.')
    expect(alertMock).toHaveBeenCalledWith('Erro ao programar troca de plano.')
  })
})
