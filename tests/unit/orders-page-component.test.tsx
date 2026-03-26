import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useOrdersMock = vi.fn()
const useUpdateOrderStatusMock = vi.fn()
const useDeliveryDriversMock = vi.fn()
const useHasFeatureMock = vi.fn()
const invalidateQueriesMock = vi.fn()

let capturedOrdersPageContentProps: Record<string, unknown> | null = null

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useOrders: (...args: Parameters<typeof useOrdersMock>) => useOrdersMock(...args),
  useUpdateOrderStatus: () => useUpdateOrderStatusMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliveryDrivers', () => ({
  useDeliveryDrivers: () => useDeliveryDriversMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  useHasFeature: (feature: string) => useHasFeatureMock(feature),
}))

vi.mock('@/features/orders/OrdersPageContent', () => ({
  OrdersPageContent: (props: Record<string, unknown>) => {
    capturedOrdersPageContentProps = props
    return React.createElement('div', null, 'Orders Page Content Mock')
  },
}))

describe('PedidosPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOrdersPageContentProps = null

    useOrdersMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'order-1',
            order_number: 42,
            status: 'ready',
            payment_status: 'pending',
            payment_method: 'delivery',
            delivery_status: 'assigned',
          },
        ],
        count: 1,
      },
      isLoading: false,
    })
    useDeliveryDriversMock.mockReturnValue({
      data: [{ id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true }],
    })
    useHasFeatureMock.mockReturnValue(true)
    useUpdateOrderStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    invalidateQueriesMock.mockResolvedValue(undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          checkout_url: 'https://mp.test/checkout',
        },
      }),
    }))
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('prompt', vi.fn(() => 'Cliente desistiu'))
    vi.stubGlobal('window', {
      open: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais da página', async () => {
    const { default: PedidosPage } = await import('@/app/(dashboard)/pedidos/page')

    expect(renderToStaticMarkup(React.createElement(PedidosPage))).toContain('Orders Page Content Mock')
    expect(capturedOrdersPageContentProps).toBeTruthy()

    const props = capturedOrdersPageContentProps as {
      filters: Array<{ label: string; value: string }>
      statusFilter: string
      page: number
      totalCount: number
      deliveryDrivers: Array<{ id: string; name: string }>
      hasWhatsappNotifications: boolean
      onStatusFilterChange: (value: string) => void
      onPageChange: (page: number) => void
      onConfirmPayment: (order: { id: string }) => Promise<void>
      onMercadoPagoCheckout: (order: { id: string }) => Promise<void>
      onAssignDriver: (order: { id: string; status: string }, driverId: string) => Promise<void>
      onAdvance: (order: { id: string; status: string }) => Promise<void>
      onAdvanceDelivery: (order: { id: string; status: string; delivery_status?: string }) => Promise<void>
      onCancel: (order: { id: string }) => Promise<void>
    }

    expect(props.filters).toEqual([
      { label: 'Todos', value: '' },
      { label: 'Aguardando', value: 'pending' },
      { label: 'Preparando', value: 'preparing' },
      { label: 'Pronto', value: 'ready' },
      { label: 'Entregue', value: 'delivered' },
      { label: 'Cancelado', value: 'cancelled' },
    ])
    expect(props.statusFilter).toBe('')
    expect(props.page).toBe(1)
    expect(props.totalCount).toBe(1)
    expect(props.deliveryDrivers).toEqual([{ id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true }])
    expect(props.hasWhatsappNotifications).toBe(true)

    props.onStatusFilterChange('ready')
    props.onPageChange(3)

    const mutateAsync = useUpdateOrderStatusMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    await props.onAdvance({ id: 'order-1', status: 'pending' })
    await props.onAdvanceDelivery({ id: 'order-1', status: 'ready', delivery_status: 'assigned' })
    await props.onAssignDriver({ id: 'order-1', status: 'ready' }, 'driver-1')
    await props.onCancel({ id: 'order-1' })
    await props.onMercadoPagoCheckout({ id: 'order-1' })
    await props.onConfirmPayment({ id: 'order-1' })

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'order-1', status: 'confirmed' })
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'order-1',
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'order-1',
      status: 'ready',
      delivery_driver_id: 'driver-1',
    })
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'order-1',
      status: 'cancelled',
      cancelled_reason: 'Cliente desistiu',
    })

    expect(fetch).toHaveBeenCalledWith('/api/orders/order-1/mercado-pago', { method: 'POST' })
    expect(window.open).toHaveBeenCalledWith('https://mp.test/checkout', '_blank,noopener,noreferrer')
    expect(fetch).toHaveBeenCalledWith('/api/orders/order-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'paid' }),
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  it('cobre branches de cancelamento abortado, checkout com erro e avanço sem payload', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useUpdateOrderStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    })
    useDeliveryDriversMock.mockReturnValue({ data: [] })
    useHasFeatureMock.mockReturnValue(false)
    vi.stubGlobal('prompt', vi.fn(() => null))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: 'Falha ao gerar cobrança',
      }),
    }))

    const { default: PedidosPage } = await import('@/app/(dashboard)/pedidos/page')
    renderToStaticMarkup(React.createElement(PedidosPage))

    const props = capturedOrdersPageContentProps as {
      deliveryDrivers: Array<unknown>
      hasWhatsappNotifications: boolean
      onAdvance: (order: { id: string; status: string }) => Promise<void>
      onAdvanceDelivery: (order: { id: string; status: string; delivery_status?: string }) => Promise<void>
      onCancel: (order: { id: string }) => Promise<void>
      onMercadoPagoCheckout: (order: { id: string }) => Promise<void>
    }

    expect(props.deliveryDrivers).toEqual([])
    expect(props.hasWhatsappNotifications).toBe(false)

    await props.onAdvance({ id: 'order-1', status: 'cancelled' })
    await props.onAdvanceDelivery({ id: 'order-1', status: 'confirmed' })
    await props.onCancel({ id: 'order-1' })
    await props.onMercadoPagoCheckout({ id: 'order-1' })

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith('Falha ao gerar cobrança')
  })

  it('aplica fallbacks de listas quando os hooks retornam dados ausentes', async () => {
    useOrdersMock.mockReturnValue({
      data: null,
      isLoading: true,
    })
    useDeliveryDriversMock.mockReturnValue({ data: undefined })

    const { default: PedidosPage } = await import('@/app/(dashboard)/pedidos/page')
    renderToStaticMarkup(React.createElement(PedidosPage))

    const props = capturedOrdersPageContentProps as {
      isLoading: boolean
      orders: unknown[]
      totalCount?: number
      deliveryDrivers: unknown[]
    }

    expect(props.isLoading).toBe(true)
    expect(props.orders).toEqual([])
    expect(props.totalCount).toBeUndefined()
    expect(props.deliveryDrivers).toEqual([])
  })
})
