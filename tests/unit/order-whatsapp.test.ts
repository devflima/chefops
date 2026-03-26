import { describe, expect, it } from 'vitest'

import {
  buildOrderWhatsappMessage,
  normalizeBrazilPhone,
  normalizeWhatsappChannelAddress,
} from '@/lib/order-whatsapp'

describe('order whatsapp helpers', () => {
  it('normalizeBrazilPhone normaliza formatos locais e internacionais', () => {
    expect(normalizeBrazilPhone('(11) 91234-5678')).toBe('+5511912345678')
    expect(normalizeBrazilPhone('5511912345678')).toBe('+5511912345678')
    expect(normalizeBrazilPhone('+55 (11) 91234-5678')).toBe('+5511912345678')
    expect(normalizeBrazilPhone('1199999999')).toBe('+551199999999')
    expect(normalizeBrazilPhone('   ')).toBeNull()
    expect(normalizeBrazilPhone('abc')).toBeNull()
    expect(normalizeBrazilPhone('123')).toBe('+123')
    expect(normalizeBrazilPhone('')).toBeNull()
  })

  it('normalizeWhatsappChannelAddress prefixa canal corretamente', () => {
    expect(normalizeWhatsappChannelAddress('+55 (11) 91234-5678')).toBe('whatsapp:+5511912345678')
    expect(normalizeWhatsappChannelAddress('whatsapp:+5511912345678')).toBe('whatsapp:+5511912345678')
    expect(normalizeWhatsappChannelAddress('5511912345678')).toBe('whatsapp:+5511912345678')
    expect(normalizeWhatsappChannelAddress('abc')).toBe('abc')
    expect(normalizeWhatsappChannelAddress('   ')).toBe('')
  })

  it('buildOrderWhatsappMessage inclui motivo e reembolso no cancelamento', () => {
    const message = buildOrderWhatsappMessage({
      eventKey: 'order_cancelled',
      tenantName: 'ChefOps Pizza',
      order: {
        id: '1',
        tenant_id: 'tenant-1',
        order_number: 42,
        customer_name: 'Felipe',
        customer_phone: '+5511999999999',
        status: 'cancelled',
        payment_status: 'refunded',
        refunded_at: '2026-03-20T12:00:00.000Z',
        cancelled_reason: 'Cliente desistiu',
        total: 100,
      },
    })

    expect(message).toMatch(/Felipe/)
    expect(message).toMatch(/#42/)
    expect(message).toMatch(/Motivo: Cliente desistiu\./)
    expect(message).toMatch(/reembolso do pagamento foi solicitado/i)
  })

  it('buildOrderWhatsappMessage cobre eventos restantes e fallback de cliente/tenant', () => {
    const baseOrder = {
      id: '1',
      tenant_id: 'tenant-1',
      order_number: 7,
      customer_name: '   ',
      customer_phone: '+5511999999999',
      status: 'pending',
      payment_status: 'pending',
      refunded_at: null,
      cancelled_reason: null,
      total: 50,
    }

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_received',
        tenantName: 'ChefOps',
        order: baseOrder,
      })
    ).toMatch(/Olá, cliente!/)

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_confirmed',
        tenantName: 'ChefOps',
        order: baseOrder,
      })
    ).toMatch(/confirmado/)

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_preparing',
        tenantName: 'ChefOps',
        order: baseOrder,
      })
    ).toMatch(/preparo/)

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_ready',
        tenantName: 'ChefOps',
        order: baseOrder,
      })
    ).toMatch(/está pronto/)

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_out_for_delivery',
        tenantName: 'ChefOps',
        order: baseOrder,
      })
    ).toMatch(/saiu para entrega/)

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_delivered',
        tenantName: 'ChefOps',
        order: baseOrder,
      })
    ).toMatch(/Bom apetite!/)

    expect(
      buildOrderWhatsappMessage({
        eventKey: 'order_cancelled',
        tenantName: 'ChefOps',
        order: {
          ...baseOrder,
          payment_status: 'pending',
        },
      })
    ).not.toMatch(/reembolso/)
  })
})
