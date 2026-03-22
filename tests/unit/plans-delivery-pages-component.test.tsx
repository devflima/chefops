import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const usePlanMock = vi.fn()
const searchParamsMock = vi.fn()
const createPlanSubscriptionMock = vi.fn()
const cancelPlanSubscriptionMock = vi.fn()
const schedulePlanSubscriptionChangeMock = vi.fn()
const isPaidSubscriptionActiveMock = vi.fn()
const useUserMock = vi.fn()
const useDeliveryDriversMock = vi.fn()
const useCreateDeliveryDriverMock = vi.fn()
const useUpdateDeliveryDriverMock = vi.fn()
const useDeleteDeliveryDriverMock = vi.fn()

let capturedPlanosPageContentProps: Record<string, unknown> | null = null
let capturedDeliveryDriversPageContentProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
    useEffect: (effect: () => void | (() => void)) => {
      effect()
    },
  }
})

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: searchParamsMock,
  }),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
}))

vi.mock('@/features/plans/plans-page', async () => {
  const actual = await vi.importActual<typeof import('@/features/plans/plans-page')>(
    '@/features/plans/plans-page'
  )

  return {
    ...actual,
    createPlanSubscription: (...args: Parameters<typeof createPlanSubscriptionMock>) =>
      createPlanSubscriptionMock(...args),
    cancelPlanSubscription: (...args: Parameters<typeof cancelPlanSubscriptionMock>) =>
      cancelPlanSubscriptionMock(...args),
    schedulePlanSubscriptionChange: (...args: Parameters<typeof schedulePlanSubscriptionChangeMock>) =>
      schedulePlanSubscriptionChangeMock(...args),
    isPaidSubscriptionActive: (...args: Parameters<typeof isPaidSubscriptionActiveMock>) =>
      isPaidSubscriptionActiveMock(...args),
  }
})

vi.mock('@/features/plans/components/PlanosPageContent', () => ({
  PlanosPageContent: (props: Record<string, unknown>) => {
    capturedPlanosPageContentProps = props
    return React.createElement('div', null, 'Planos Page Content Mock')
  },
}))

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliveryDrivers', () => ({
  useDeliveryDrivers: () => useDeliveryDriversMock(),
  useCreateDeliveryDriver: () => useCreateDeliveryDriverMock(),
  useUpdateDeliveryDriver: () => useUpdateDeliveryDriverMock(),
  useDeleteDeliveryDriver: () => useDeleteDeliveryDriverMock(),
}))

vi.mock('@/features/delivery/DeliveryDriversPageContent', () => ({
  DeliveryDriversPageContent: (props: Record<string, unknown>) => {
    capturedDeliveryDriversPageContentProps = props
    return React.createElement('div', null, 'Delivery Drivers Page Content Mock')
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('plans and delivery page components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStateMock.mockImplementation((initial: unknown) => [initial, vi.fn()])
    capturedPlanosPageContentProps = null
    capturedDeliveryDriversPageContentProps = null

    usePlanMock.mockReturnValue({
      data: {
        plan: 'basic',
      },
    })
    searchParamsMock.mockImplementation((key: string) => (key === 'billing' ? 'return' : null))
    createPlanSubscriptionMock.mockResolvedValue('https://checkout.test/plan')
    cancelPlanSubscriptionMock.mockResolvedValue({
      subscription: {
        status: 'authorized',
        plan: 'basic',
        next_payment_date: '2026-04-01',
      },
      message: 'Assinatura cancelada.',
    })
    schedulePlanSubscriptionChangeMock.mockResolvedValue({
      subscription: {
        status: 'authorized',
        plan: 'basic',
        next_payment_date: '2026-04-01',
        scheduled_plan: 'pro',
      },
      message: 'Mudança agendada.',
    })
    isPaidSubscriptionActiveMock.mockReturnValue(false)

    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'owner',
        },
      },
    })

    const createMutateAsync = vi.fn().mockResolvedValue(undefined)
    const updateMutateAsync = vi.fn().mockResolvedValue(undefined)
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined)

    useDeliveryDriversMock.mockReturnValue({
      data: [
        {
          id: 'driver-1',
          name: 'Carlos',
          phone: '11999999999',
          vehicle_type: 'moto',
          notes: 'Turno noite',
          active: true,
        },
      ],
      isLoading: false,
    })
    useCreateDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: createMutateAsync,
    })
    useUpdateDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: updateMutateAsync,
    })
    useDeleteDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          data: {
            status: 'authorized',
            plan: 'basic',
            next_payment_date: '2026-04-01',
          },
        }),
      })
    )
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('window', {
      confirm: vi.fn(() => true),
      location: { href: '' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encaminha ações principais da página de planos', async () => {
    const setLoadingPlanMock = vi.fn()
    const setCurrentSubscriptionMock = vi.fn()
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, setLoadingPlanMock])
      .mockImplementationOnce(() => [null, setCurrentSubscriptionMock])

    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')

    expect(renderToStaticMarkup(React.createElement(PlanosPage))).toContain('Planos Page Content Mock')
    await Promise.resolve()
    await Promise.resolve()
    expect(capturedPlanosPageContentProps).toBeTruthy()

    const props = capturedPlanosPageContentProps as {
      currentPlan?: string
      onSelectPlan: (plan: 'free' | 'basic' | 'pro') => void
      onCancelSubscription: () => Promise<void>
    }

    expect(props.currentPlan).toBe('basic')
    expect(fetch).toHaveBeenCalledWith('/api/billing/subscription')
    expect(alert).toHaveBeenCalledWith(
      'Retorno da assinatura recebido. Assim que o Mercado Pago confirmar, o plano será atualizado automaticamente.'
    )

    props.onSelectPlan('free')
    expect(alert).toHaveBeenCalledWith(
      'Downgrade para o plano Basic será tratado manualmente neste primeiro momento.'
    )

    await props.onSelectPlan('pro')
    expect(createPlanSubscriptionMock).toHaveBeenCalledWith('pro')
    expect(setLoadingPlanMock).toHaveBeenCalledWith('pro')
    expect(setLoadingPlanMock).toHaveBeenCalledWith(null)

    await props.onCancelSubscription()
    expect(cancelPlanSubscriptionMock).toHaveBeenCalledTimes(1)
    expect(setCurrentSubscriptionMock).toHaveBeenCalledWith({
      status: 'authorized',
      plan: 'basic',
      next_payment_date: '2026-04-01',
    })
  })

  it('cobre troca agendada, cancelamento abortado e erros da página de planos', async () => {
    const setLoadingPlanMock = vi.fn()
    const setCurrentSubscriptionMock = vi.fn()
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, setLoadingPlanMock])
      .mockImplementationOnce(() => [{
        status: 'authorized',
        plan: 'basic',
        next_payment_date: '2026-04-01',
      }, setCurrentSubscriptionMock])

    searchParamsMock.mockReturnValue(null)
    isPaidSubscriptionActiveMock.mockReturnValue(true)
    schedulePlanSubscriptionChangeMock.mockResolvedValueOnce({
      subscription: {
        status: 'authorized',
        plan: 'basic',
        next_payment_date: '2026-04-01',
        scheduled_plan: 'pro',
      },
      message: 'Mudança agendada.',
    })
    const windowConfirmMock = vi.fn(() => false)
    vi.stubGlobal('window', {
      confirm: windowConfirmMock,
      location: { href: '' },
    })

    const { default: PlanosPageScheduled } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPageScheduled))
    await Promise.resolve()
    await Promise.resolve()

    const props = capturedPlanosPageContentProps as {
      onSelectPlan: (plan: 'free' | 'basic' | 'pro') => Promise<void> | void
      onCancelSubscription: () => Promise<void>
    }

    await props.onSelectPlan('pro')
    expect(schedulePlanSubscriptionChangeMock).toHaveBeenCalledWith('pro')
    expect(setCurrentSubscriptionMock).toHaveBeenCalledWith({
      status: 'authorized',
      plan: 'basic',
      next_payment_date: '2026-04-01',
      scheduled_plan: 'pro',
    })
    expect(alert).toHaveBeenCalledWith('Mudança agendada.')

    await props.onCancelSubscription()
    expect(windowConfirmMock).toHaveBeenCalled()
    expect(cancelPlanSubscriptionMock).toHaveBeenCalledTimes(0)

    createPlanSubscriptionMock.mockRejectedValueOnce(new Error('Falha ao iniciar assinatura'))
    isPaidSubscriptionActiveMock.mockReturnValue(false)
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [null, vi.fn()])

    const { default: PlanosPageErrorSubscribe } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPageErrorSubscribe))
    await Promise.resolve()
    await (capturedPlanosPageContentProps as { onSelectPlan: (plan: 'free' | 'basic' | 'pro') => Promise<void> | void }).onSelectPlan('pro')
    expect(alert).toHaveBeenCalledWith('Falha ao iniciar assinatura')

    cancelPlanSubscriptionMock.mockRejectedValueOnce(new Error('Falha ao cancelar'))
    const confirmTrueMock = vi.fn(() => true)
    vi.stubGlobal('window', {
      confirm: confirmTrueMock,
      location: { href: '' },
    })
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [null, vi.fn()])

    const { default: PlanosPageErrorCancel } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPageErrorCancel))
    await Promise.resolve()
    await (capturedPlanosPageContentProps as { onCancelSubscription: () => Promise<void> }).onCancelSubscription()
    expect(alert).toHaveBeenCalledWith('Falha ao cancelar')

    schedulePlanSubscriptionChangeMock.mockRejectedValueOnce(new Error('Falha ao programar'))
    isPaidSubscriptionActiveMock.mockReturnValue(true)
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [{
        status: 'authorized',
        plan: 'basic',
        next_payment_date: '2026-04-01',
      }, vi.fn()])

    const { default: PlanosPageErrorSchedule } = await import('@/app/(dashboard)/planos/page')
    renderToStaticMarkup(React.createElement(PlanosPageErrorSchedule))
    await Promise.resolve()
    await (capturedPlanosPageContentProps as { onSelectPlan: (plan: 'free' | 'basic' | 'pro') => Promise<void> | void }).onSelectPlan('pro')
    expect(alert).toHaveBeenCalledWith('Falha ao programar')
  })

  it('encaminha ações principais da página de entregadores', async () => {
    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')

    expect(renderToStaticMarkup(React.createElement(EntregadoresPage))).toContain(
      'Delivery Drivers Page Content Mock'
    )
    expect(capturedDeliveryDriversPageContentProps).toBeTruthy()

    const props = capturedDeliveryDriversPageContentProps as {
      canManage: boolean
      activeDrivers: number
      openCreate: () => void
      openEdit: (driver: Record<string, unknown>) => void
      onDelete: (driver: Record<string, unknown>) => Promise<void>
      onOpenChange: (open: boolean) => void
      onNameChange: (value: string) => void
      onPhoneChange: (value: string) => void
      onVehicleTypeChange: (value: 'moto' | 'bike' | 'carro' | 'outro') => void
      onNotesChange: (value: string) => void
      onActiveChange: (value: boolean) => void
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
    }

    expect(props.canManage).toBe(true)
    expect(props.activeDrivers).toBe(1)

    props.openCreate()
    props.openEdit({
      id: 'driver-1',
      name: 'Carlos',
      phone: '11999999999',
      vehicle_type: 'moto',
      notes: 'Turno noite',
      active: true,
    })
    await props.onDelete({
      id: 'driver-1',
      name: 'Carlos',
    })
    props.onOpenChange(false)
    props.onNameChange('João')
    props.onPhoneChange('11888888888')
    props.onVehicleTypeChange('bike')
    props.onNotesChange('Centro')
    props.onActiveChange(false)
    await props.onSubmit({
      preventDefault: vi.fn(),
    })

    const createMutateAsync = useCreateDeliveryDriverMock.mock.results[0]?.value
      .mutateAsync as ReturnType<typeof vi.fn>
    const deleteMutateAsync = useDeleteDeliveryDriverMock.mock.results[0]?.value
      .mutateAsync as ReturnType<typeof vi.fn>

    expect(deleteMutateAsync).toHaveBeenCalledWith('driver-1')
    expect(createMutateAsync).toHaveBeenCalled()
  })

  it('cobre cancelamento, edição e erros da página de entregadores', async () => {
    const createMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao criar entregador'))
    const updateMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao atualizar entregador'))
    const deleteMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao remover entregador'))

    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'cashier',
        },
      },
    })
    useCreateDeliveryDriverMock.mockReturnValue({
      isPending: true,
      mutateAsync: createMutateAsync,
    })
    useUpdateDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: updateMutateAsync,
    })
    useDeleteDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    })
    const windowConfirmMock = vi.fn(() => false)
    vi.stubGlobal('window', {
      confirm: windowConfirmMock,
      location: { href: '' },
    })

    const { toast } = await import('sonner')
    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')
    renderToStaticMarkup(React.createElement(EntregadoresPage))

    const props = capturedDeliveryDriversPageContentProps as {
      canManage: boolean
      submitDisabled: boolean
      onDelete: (driver: Record<string, unknown>) => Promise<void>
      openEdit: (driver: Record<string, unknown>) => void
      openCreate: () => void
      onNameChange: (value: string) => void
      onPhoneChange: (value: string) => void
      onVehicleTypeChange: (value: 'moto' | 'bike' | 'carro' | 'outro') => void
      onNotesChange: (value: string) => void
      onActiveChange: (value: boolean) => void
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
    }

    expect(props.canManage).toBe(false)
    expect(props.submitDisabled).toBe(true)

    await props.onDelete({
      id: 'driver-1',
      name: 'Carlos',
    })
    expect(deleteMutateAsync).not.toHaveBeenCalled()

    props.openCreate()
    props.onNameChange('Novo Entregador')
    props.onPhoneChange('11888888888')
    props.onVehicleTypeChange('bike')
    props.onNotesChange('Centro')
    props.onActiveChange(false)
    await props.onSubmit({
      preventDefault: vi.fn(),
    })

    expect(createMutateAsync).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Falha ao criar entregador')

    windowConfirmMock.mockReturnValue(true)
    await props.onDelete({
      id: 'driver-1',
      name: 'Carlos',
    })

    expect(deleteMutateAsync).toHaveBeenCalledWith('driver-1')
    expect(toast.error).toHaveBeenCalledWith('Falha ao remover entregador')
  })
})
