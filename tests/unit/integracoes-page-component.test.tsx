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

let capturedContentProps: Record<string, unknown> | null = null

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

vi.mock('@/features/payments/IntegrationsPageContent', () => ({
  IntegrationsPageContent: (props: Record<string, unknown>) => {
    capturedContentProps = props
    return React.createElement('div', null, 'Integrations Page Content Mock')
  },
}))

describe('IntegracoesPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedContentProps = null
    searchParamsGetMock.mockReturnValue('connected')
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
    vi.doUnmock('react')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('encaminha estados e handlers principais da página', async () => {
    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')

      return {
        ...actualReact,
        useEffect: (callback: () => void) => callback(),
      }
    })

    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')

    expect(renderToStaticMarkup(React.createElement(IntegracoesPage))).toContain(
      'Integrations Page Content Mock'
    )
    expect(alert).toHaveBeenCalledWith('Conta Mercado Pago conectada com sucesso.')
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
    })
    await props.onDeliveryFeeSave({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 14.5,
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
    })
    expect(updateDeliveryMutateAsync).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 14.5,
    })
    expect(updateNotificationMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp_order_received: false,
      })
    )
  })
})
