import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { sendOrderWhatsappNotification } = await import('@/lib/order-whatsapp')

describe('sendOrderWhatsappNotification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'sid'
    process.env.TWILIO_AUTH_TOKEN = 'token'
    process.env.TWILIO_WHATSAPP_FROM = '+5511999999999'
  })

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_WHATSAPP_FROM
  })

  it('ignora envio quando ja existe notificacao enviada', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        order_notifications: () => ({
          data: { id: 'log-1' },
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-1',
        eventKey: 'order_received',
      })
    ).resolves.toEqual({
      sent: false,
      reason: 'already-sent',
    })
  })

  it('registra skip quando o pedido nao tem telefone', async () => {
    const insertedLogs: Record<string, unknown>[] = []

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        order_notifications: (state) => {
          if (state.operation === 'select') {
            return { data: null, error: null }
          }

          insertedLogs.push(state.rows?.[0] as Record<string, unknown>)
          return { data: null, error: null }
        },
        orders: () => ({
          data: {
            id: 'order-1',
            tenant_id: 'tenant-1',
            order_number: 10,
            customer_name: 'Felipe',
            customer_phone: null,
            status: 'pending',
            payment_status: 'pending',
            refunded_at: null,
            cancelled_reason: null,
            total: 50,
          },
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-1',
        eventKey: 'order_received',
      })
    ).resolves.toEqual({
      sent: false,
      reason: 'missing-phone',
    })

    expect(insertedLogs[0]).toMatchObject({
      status: 'skipped',
      error_message: 'missing-phone',
    })
  })

  it('envia mensagem e registra sucesso quando elegivel', async () => {
    const insertedLogs: Record<string, unknown>[] = []
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sid: 'twilio-1' }), { status: 200 })
    )

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        order_notifications: (state) => {
          if (state.operation === 'select') {
            return { data: null, error: null }
          }

          insertedLogs.push(state.rows?.[0] as Record<string, unknown>)
          return { data: null, error: null }
        },
        orders: () => ({
          data: {
            id: 'order-1',
            tenant_id: 'tenant-1',
            order_number: 20,
            customer_name: 'Felipe',
            customer_phone: '(11) 91234-5678',
            status: 'confirmed',
            payment_status: 'paid',
            refunded_at: null,
            cancelled_reason: null,
            total: 50,
          },
          error: null,
        }),
        tenants: () => ({
          data: {
            name: 'ChefOps Pizza',
            plan: 'basic',
          },
          error: null,
        }),
        tenant_notification_settings: () => ({
          data: {
            whatsapp_order_received: true,
            whatsapp_order_confirmed: true,
            whatsapp_order_preparing: true,
            whatsapp_order_ready: true,
            whatsapp_order_delivered: false,
            whatsapp_order_cancelled: true,
          },
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-1',
        eventKey: 'order_confirmed',
      })
    ).resolves.toEqual({ sent: true })

    expect(fetchMock).toHaveBeenCalled()
    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'sent',
      recipient: '+5511912345678',
      provider_message_id: 'twilio-1',
    })
  })

  it('registra falha do Twilio e propaga erro', async () => {
    const insertedLogs: Record<string, unknown>[] = []
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'blocked' }), { status: 400 })
    )

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        order_notifications: (state) => {
          if (state.operation === 'select') {
            return { data: null, error: null }
          }

          insertedLogs.push(state.rows?.[0] as Record<string, unknown>)
          return { data: null, error: null }
        },
        orders: () => ({
          data: {
            id: 'order-1',
            tenant_id: 'tenant-1',
            order_number: 20,
            customer_name: 'Felipe',
            customer_phone: '(11) 91234-5678',
            status: 'confirmed',
            payment_status: 'paid',
            refunded_at: null,
            cancelled_reason: null,
            total: 50,
          },
          error: null,
        }),
        tenants: () => ({
          data: {
            name: 'ChefOps Pizza',
            plan: 'basic',
          },
          error: null,
        }),
        tenant_notification_settings: () => ({
          data: {
            whatsapp_order_received: true,
            whatsapp_order_confirmed: true,
            whatsapp_order_preparing: true,
            whatsapp_order_ready: true,
            whatsapp_order_delivered: false,
            whatsapp_order_cancelled: true,
          },
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-1',
        eventKey: 'order_confirmed',
      })
    ).rejects.toThrow(/blocked/)

    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'failed',
      error_message: 'blocked',
    })
  })
})
