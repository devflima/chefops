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

  it('propaga erro padrão quando o pedido não é encontrado sem erro explícito', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        order_notifications: () => ({
          data: null,
          error: null,
        }),
        orders: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-missing',
        eventKey: 'order_received',
      })
    ).rejects.toThrow('Pedido não encontrado para notificação WhatsApp.')
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

  it('usa fallbacks de tenant, settings e providerMessageId no envio bem-sucedido', async () => {
    const insertedLogs: Record<string, unknown>[] = []
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
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
            id: 'order-2',
            tenant_id: 'tenant-2',
            order_number: 30,
            customer_name: null,
            customer_phone: '(11) 98888-7777',
            status: 'confirmed',
            payment_status: 'paid',
            delivery_status: 'out_for_delivery',
            refunded_at: null,
            cancelled_reason: null,
            total: 50,
          },
          error: null,
        }),
        tenants: () => ({
          data: {
            name: null,
            plan: 'basic',
          },
          error: null,
        }),
        tenant_notification_settings: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-2',
        eventKey: 'order_received',
      })
    ).resolves.toEqual({ sent: true })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/Messages.json'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      })
    )
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(body.get('Body')).toContain('Olá, cliente!')
    expect(body.get('Body')).toContain('foi recebido')
    expect(body.get('Body')).toContain('estabelecimento')
    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'sent',
      recipient: '+5511988887777',
      provider_message_id: null,
    })
  })

  it('propaga erro quando falha ao gravar o log de sucesso', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sid: 'twilio-log-fail' }), { status: 200 })
    )

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        order_notifications: (state) => {
          if (state.operation === 'select') {
            return { data: null, error: null }
          }

          return {
            data: null,
            error: new Error('order-notification-log-failed'),
          }
        },
        orders: () => ({
          data: {
            id: 'order-log-fail',
            tenant_id: 'tenant-1',
            order_number: 31,
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
        orderId: 'order-log-fail',
        eventKey: 'order_confirmed',
      })
    ).rejects.toThrow('order-notification-log-failed')

    expect(fetchMock).toHaveBeenCalled()
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

  it('registra skip quando a configuração do Twilio está ausente', async () => {
    delete process.env.TWILIO_ACCOUNT_SID

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
            order_number: 21,
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
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-1',
        eventKey: 'order_confirmed',
      })
    ).resolves.toEqual({
      sent: false,
      reason: 'missing-config',
    })

    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'skipped',
      recipient: '+5511912345678',
      error_message: 'missing-twilio-config',
    })
  })

  it('registra skip quando o plano não possui a feature de WhatsApp', async () => {
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
            order_number: 22,
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
            plan: 'free',
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
    ).resolves.toEqual({
      sent: false,
      reason: 'feature-not-available',
    })

    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'skipped',
      error_message: 'feature-not-available-for-plan',
    })
  })

  it('registra skip quando o tenant não é encontrado e o fallback cai no plano free', async () => {
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
            id: 'order-tenant-null',
            tenant_id: 'tenant-missing',
            order_number: 22,
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
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(
      sendOrderWhatsappNotification({
        orderId: 'order-tenant-null',
        eventKey: 'order_confirmed',
      })
    ).resolves.toEqual({
      sent: false,
      reason: 'feature-not-available',
    })

    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'skipped',
      error_message: 'feature-not-available-for-plan',
    })
  })

  it('registra skip quando o evento está desabilitado pelo tenant', async () => {
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
            order_number: 23,
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
            whatsapp_order_confirmed: false,
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
    ).resolves.toEqual({
      sent: false,
      reason: 'event-disabled',
    })

    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'skipped',
      error_message: 'event-disabled-by-tenant',
    })
  })

  it('usa fallback quando o Twilio falha sem JSON parseável', async () => {
    const insertedLogs: Record<string, unknown>[] = []
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('unparseable', { status: 500 })
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
            order_number: 24,
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
    ).rejects.toThrow(/Erro ao enviar WhatsApp pelo Twilio\./)

    expect(insertedLogs.at(-1)).toMatchObject({
      status: 'failed',
      error_message: 'twilio-send-failed',
      metadata: { status: 500 },
    })
  })
})
