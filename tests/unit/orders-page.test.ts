import { describe, expect, it } from 'vitest'

import {
  buildAdvanceDeliveryPayload,
  buildAdvanceOrderPayload,
  buildCancelOrderPayload,
  buildConfirmPaymentRequest,
  buildMercadoPagoCheckoutRequest,
  buildDriverAssignmentPayload,
  getMercadoPagoCheckoutErrorMessage,
  getMercadoPagoWindowOpenFeatures,
  getDeliveryActionLabel,
  getOrderFilterChangeState,
  getLatestWhatsappNotification,
  getOrderFilters,
  getOrdersInvalidationQueryKey,
  getOrdersTotalPages,
  getSortedNotifications,
  normalizeDeliveryAddress,
  resolveMercadoPagoCheckoutUrl,
  shouldShowAdvanceButton,
  shouldShowWhatsappCard,
} from '@/features/orders/orders-page'

describe('orders-page helpers', () => {
  it('normaliza endereco de entrega em string, objeto e entradas invalidas', () => {
    expect(normalizeDeliveryAddress('{"street":"Rua A","number":"10"}')).toEqual({
      street: 'Rua A',
      number: '10',
    })
    expect(normalizeDeliveryAddress({ street: 'Rua B' })).toEqual({ street: 'Rua B' })
    expect(normalizeDeliveryAddress('{invalid')).toBeNull()
    expect(normalizeDeliveryAddress(null)).toBeNull()
    expect(normalizeDeliveryAddress(123)).toBeNull()
  })

  it('monta filtros e ordena notificacoes do whatsapp', () => {
    expect(getOrderFilters()).toEqual([
      { label: 'Todos', value: '' },
      { label: 'Aguardando', value: 'pending' },
      { label: 'Preparando', value: 'preparing' },
      { label: 'Pronto', value: 'ready' },
      { label: 'Entregue', value: 'delivered' },
      { label: 'Cancelado', value: 'cancelled' },
    ])

    const order = {
      notifications: [
        { id: '1', created_at: '2026-03-21T10:00:00.000Z' },
        { id: '2', created_at: '2026-03-21T12:00:00.000Z' },
      ],
    }

    expect(getSortedNotifications(order as never).map((item) => item.id)).toEqual(['2', '1'])
    expect(getLatestWhatsappNotification(order as never)?.id).toBe('2')
    expect(getSortedNotifications({ notifications: null } as never)).toEqual([])
    expect(getLatestWhatsappNotification({ notifications: null } as never)).toBeNull()
  })

  it('decide cards e acoes de entrega conforme contexto do pedido', () => {
    expect(shouldShowWhatsappCard({
      payment_method: 'delivery',
      table_number: null,
      notifications: [{ id: '1', created_at: '2026-03-21T12:00:00.000Z' }],
    } as never, true)).toBe(true)

    expect(shouldShowWhatsappCard({
      payment_method: 'table',
      table_number: '10',
      notifications: [{ id: '1', created_at: '2026-03-21T12:00:00.000Z' }],
    } as never, true)).toBe(false)

    expect(shouldShowWhatsappCard({
      payment_method: 'online',
      table_number: null,
      notifications: [{ id: '1', created_at: '2026-03-21T12:00:00.000Z' }],
    } as never, false)).toBe(false)

    expect(shouldShowAdvanceButton({
      status: 'confirmed',
      delivery_address: null,
    } as never)).toBe(true)

    expect(shouldShowAdvanceButton({
      status: 'ready',
      delivery_address: { street: 'Rua A' },
    } as never)).toBe(false)

    expect(getDeliveryActionLabel({ status: 'ready', delivery_status: 'out_for_delivery' } as never)).toBe('Confirmar entrega')
    expect(getDeliveryActionLabel({ status: 'ready', delivery_status: 'assigned' } as never)).toBe('Saiu para entrega')
    expect(getDeliveryActionLabel({ status: 'confirmed', delivery_status: 'assigned' } as never)).toBeNull()
  })

  it('monta payloads de pedidos, entrega, pagamento e checkout', () => {
    expect(buildAdvanceOrderPayload({ id: 'order-1', status: 'pending' } as never)).toEqual({
      id: 'order-1',
      status: 'confirmed',
    })
    expect(buildAdvanceOrderPayload({ id: 'order-2', status: 'delivered' } as never)).toBeNull()

    expect(buildDriverAssignmentPayload({ id: 'order-1', status: 'ready' } as never, 'driver-1')).toEqual({
      id: 'order-1',
      status: 'ready',
      delivery_driver_id: 'driver-1',
    })
    expect(buildDriverAssignmentPayload({ id: 'order-1', status: 'ready' } as never, '')).toEqual({
      id: 'order-1',
      status: 'ready',
      delivery_driver_id: null,
    })

    expect(buildAdvanceDeliveryPayload({ id: 'order-1', status: 'ready', delivery_status: 'assigned' } as never)).toEqual({
      id: 'order-1',
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })
    expect(buildAdvanceDeliveryPayload({ id: 'order-1', status: 'ready', delivery_status: 'out_for_delivery' } as never)).toEqual({
      id: 'order-1',
      status: 'delivered',
      delivery_status: 'delivered',
    })
    expect(buildAdvanceDeliveryPayload({ id: 'order-1', status: 'confirmed', delivery_status: 'assigned' } as never)).toBeNull()

    expect(buildConfirmPaymentRequest({ id: 'order-9' })).toEqual({
      url: '/api/orders/order-9',
      init: {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid' }),
      },
    })
    expect(buildMercadoPagoCheckoutRequest({ id: 'order-9' })).toEqual({
      url: '/api/orders/order-9/mercado-pago',
      init: {
        method: 'POST',
      },
    })

    expect(resolveMercadoPagoCheckoutUrl({ sandbox_init_point: 'https://mp.test/checkout' })).toBe(
      'https://mp.test/checkout'
    )
    expect(resolveMercadoPagoCheckoutUrl({ init_point: 'https://mp.test/init' })).toBe(
      'https://mp.test/init'
    )
    expect(() => resolveMercadoPagoCheckoutUrl({})).toThrow('Mercado Pago não retornou um link de pagamento.')
    expect(buildCancelOrderPayload({ id: 'order-10' } as never, 'Cliente desistiu')).toEqual({
      id: 'order-10',
      status: 'cancelled',
      cancelled_reason: 'Cliente desistiu',
    })
    expect(getMercadoPagoCheckoutErrorMessage(new Error('Falha MP'))).toBe('Falha MP')
    expect(getMercadoPagoCheckoutErrorMessage(null)).toBe('Erro ao gerar cobrança.')
    expect(getMercadoPagoWindowOpenFeatures()).toBe('_blank,noopener,noreferrer')
    expect(getOrderFilterChangeState('ready')).toEqual({ statusFilter: 'ready', page: 1 })
    expect(getOrdersInvalidationQueryKey()).toEqual(['orders'])
    expect(getOrdersTotalPages(0, 10)).toBe(1)
    expect(getOrdersTotalPages(undefined, 10)).toBe(1)
    expect(getOrdersTotalPages(21, 10)).toBe(3)
  })
})
