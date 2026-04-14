import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useMercadoPagoAccountMock = vi.fn()
const useDisconnectMercadoPagoAccountMock = vi.fn()
const useHasFeatureMock = vi.fn()
const useNotificationSettingsMock = vi.fn()
const useUpdateNotificationSettingsMock = vi.fn()
const useDeliverySettingsMock = vi.fn()
const useUpdateDeliverySettingsMock = vi.fn()
const searchParamsGetMock = vi.fn()
let shouldRunEffects = false

let capturedContentProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actualReact = await vi.importActual<typeof import('react')>('react')

  return {
    ...actualReact,
    useEffect: (callback: () => void | (() => void), deps?: React.DependencyList) => {
      if (shouldRunEffects) {
        return callback()
      }
      return actualReact.useEffect(callback, deps)
    },
  }
})

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: searchParamsGetMock,
  }),
}))

vi.mock('@/features/payments/hooks/useMercadoPagoAccount', () => ({
  useMercadoPagoAccount: () => useMercadoPagoAccountMock(),
  useDisconnectMercadoPagoAccount: () => useDisconnectMercadoPagoAccountMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  useHasFeature: (feature: string) => useHasFeatureMock(feature),
}))

vi.mock('@/features/notifications/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => useNotificationSettingsMock(),
  useUpdateNotificationSettings: () => useUpdateNotificationSettingsMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliverySettings', () => ({
  useDeliverySettings: () => useDeliverySettingsMock(),
  useUpdateDeliverySettings: () => useUpdateDeliverySettingsMock(),
}))

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock('@/features/payments/IntegrationsPageContent', () => ({
  IntegrationsPageContent: (props: Record<string, unknown>) => {
    capturedContentProps = props
    return React.createElement('div', null, 'Integrations Page Content Mock')
  },
}))

describe('IntegracoesPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    shouldRunEffects = false
    capturedContentProps = null
    searchParamsGetMock.mockReturnValue('pending')
    useMercadoPagoAccountMock.mockReturnValue({
      data: {
        mercado_pago_user_id: 'seller-1',
        live_mode: false,
        token_expires_at: '2026-03-21T00:00:00.000Z',
      },
      isLoading: false,
    })
    useDisconnectMercadoPagoAccountMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    })
    useHasFeatureMock.mockReturnValue(true)
    useNotificationSettingsMock.mockReturnValue({
      data: {
        whatsapp_order_received: true,
        whatsapp_order_confirmed: false,
        whatsapp_order_preparing: false,
        whatsapp_order_ready: false,
        whatsapp_order_out_for_delivery: false,
        whatsapp_order_delivered: false,
        whatsapp_order_cancelled: false,
      },
      isLoading: false,
    })
    useUpdateNotificationSettingsMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useDeliverySettingsMock.mockReturnValue({
      data: {
        tenant_id: 'tenant-1',
        delivery_enabled: true,
        flat_fee: 8,
        accepting_orders: true,
        schedule_enabled: true,
        opens_at: '09:00',
        closes_at: '18:00',
      },
      isLoading: false,
    })
    useUpdateDeliverySettingsMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encaminha estados e handlers principais da página', async () => {
    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')

    expect(renderToStaticMarkup(React.createElement(IntegracoesPage))).toContain(
      'Integrations Page Content Mock'
    )
    expect(capturedContentProps).toBeTruthy()

    const props = capturedContentProps as {
      connected: boolean
      accountLoading: boolean
      disconnectPending: boolean
      deliverySettingsPending: boolean
      deliveryFeeValue: string
      whatsappOptions: Array<{ key: string; label: string }>
      onDisconnect: () => void
      onDeliveryToggle: (payload: Record<string, unknown>) => Promise<void>
      onDeliveryOperationChange: (acceptingOrders: boolean) => Promise<void>
      onDeliveryScheduleChange: (enabled: boolean) => Promise<void>
      onDeliveryHoursChange: (field: 'opens_at' | 'closes_at', value: string) => void
      onDeliveryHoursSave: (payload: Record<string, unknown>) => Promise<void>
      onDeliveryFeeInputChange: (value: string) => void
      onDeliveryFeeSave: (payload: Record<string, unknown>) => Promise<void>
      onToggleWhatsappOption: (payload: Record<string, unknown>) => Promise<void>
    }

    expect(props.connected).toBe(true)
    expect(props.accountLoading).toBe(false)
    expect(props.disconnectPending).toBe(false)
    expect(props.deliverySettingsPending).toBe(false)
    expect(props.deliveryFeeValue).toBe('8')
    expect(props.whatsappOptions).toHaveLength(7)

    const disconnectMutate = useDisconnectMercadoPagoAccountMock.mock.results[0]?.value
      .mutate as ReturnType<typeof vi.fn>
    const updateDeliveryMutateAsync = useUpdateDeliverySettingsMock.mock.results[0]?.value
      .mutateAsync as ReturnType<typeof vi.fn>
    const updateNotificationMutateAsync = useUpdateNotificationSettingsMock.mock.results[0]?.value
      .mutateAsync as ReturnType<typeof vi.fn>

    props.onDisconnect()
    props.onDeliveryFeeInputChange('14.50')
    await props.onDeliveryToggle({
      tenant_id: 'tenant-1',
      delivery_enabled: false,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })
    await props.onDeliveryOperationChange(false)
    await props.onDeliveryScheduleChange(true)
    props.onDeliveryHoursChange('opens_at', '10:00')
    props.onDeliveryHoursChange('closes_at', '22:00')
    await props.onDeliveryHoursSave({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '10:00',
      closes_at: '22:00',
    })
    await props.onDeliveryFeeSave({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 14.5,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })
    await props.onToggleWhatsappOption({
      whatsapp_order_received: false,
      whatsapp_order_confirmed: false,
      whatsapp_order_preparing: false,
      whatsapp_order_ready: false,
      whatsapp_order_out_for_delivery: false,
      whatsapp_order_delivered: false,
      whatsapp_order_cancelled: false,
    })

    expect(disconnectMutate).toHaveBeenCalledTimes(1)
    expect(updateDeliveryMutateAsync).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: false,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })
    expect(updateDeliveryMutateAsync).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 8,
      accepting_orders: false,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })
    expect(updateDeliveryMutateAsync).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })
    expect(updateDeliveryMutateAsync).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '10:00',
      closes_at: '22:00',
    })
    expect(updateDeliveryMutateAsync).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 14.5,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })
    expect(updateNotificationMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp_order_received: false,
      })
    )
  })

  it('cobre fallback sem conta conectada e alerta de erro OAuth', async () => {
    searchParamsGetMock.mockReturnValue('error')
    useMercadoPagoAccountMock.mockReturnValue({
      data: null,
      isLoading: true,
    })
    useHasFeatureMock.mockReturnValue(false)
    useNotificationSettingsMock.mockReturnValue({
      data: null,
      isLoading: true,
    })
    useDeliverySettingsMock.mockReturnValue({
      data: null,
      isLoading: true,
    })

    shouldRunEffects = true

    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')

    expect(renderToStaticMarkup(React.createElement(IntegracoesPage))).toContain(
      'Integrations Page Content Mock'
    )
    expect(alert).toHaveBeenCalledWith(
      'Não foi possível concluir a conexão com o Mercado Pago.'
    )
    expect(capturedContentProps).toBeTruthy()

    const props = capturedContentProps as {
      connected: boolean
      accountLoading: boolean
      accountData: unknown
      deliverySettingsLoading: boolean
      deliverySettingsData: unknown
      hasWhatsappNotifications: boolean
      notificationSettingsLoading: boolean
      notificationSettingsData: unknown
      whatsappOptions: unknown[]
    }

    expect(props.connected).toBe(false)
    expect(props.accountLoading).toBe(true)
    expect(props.accountData).toBeNull()
    expect(props.deliverySettingsLoading).toBe(true)
    expect(props.deliverySettingsData).toBeNull()
    expect(props.hasWhatsappNotifications).toBe(false)
    expect(props.notificationSettingsLoading).toBe(false)
    expect(props.notificationSettingsData).toBeNull()
    expect(props.whatsappOptions).toEqual([])
  })

  it('cobre retorno sem alerta quando o parâmetro do Mercado Pago não gera mensagem', async () => {
    searchParamsGetMock.mockReturnValue('pending')
    shouldRunEffects = true

    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')

    expect(renderToStaticMarkup(React.createElement(IntegracoesPage))).toContain(
      'Integrations Page Content Mock'
    )
    expect(alert).not.toHaveBeenCalled()

    const props = capturedContentProps as {
      connected: boolean
      accountData: { mercado_pago_user_id: string } | null
      deliveryFeeValue: string
      hasWhatsappNotifications: boolean
      whatsappOptions: Array<{ key: string; label: string }>
    }

    expect(props.connected).toBe(true)
    expect(props.accountData?.mercado_pago_user_id).toBe('seller-1')
    expect(props.deliveryFeeValue).toBe('8')
    expect(props.hasWhatsappNotifications).toBe(true)
    expect(props.whatsappOptions).toHaveLength(7)
  })
})
