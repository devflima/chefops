import { createAdminClient } from '@/lib/supabase/admin'

type OrderWhatsappEventKey =
  | 'order_received'
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready'
  | 'order_delivered'
  | 'order_cancelled'

type OrderForNotification = {
  id: string
  tenant_id: string
  order_number: number
  customer_name: string | null
  customer_phone: string | null
  status: string
  payment_status: string
  refunded_at: string | null
  cancelled_reason: string | null
  total: number
}

function getTwilioWhatsappConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    return null
  }

  return { accountSid, authToken, from }
}

function normalizeBrazilPhone(rawPhone: string | null | undefined) {
  if (!rawPhone) return null

  const trimmed = rawPhone.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('+')) {
    return trimmed.replace(/[^\d+]/g, '')
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('55') && digits.length >= 12) {
    return `+${digits}`
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`
  }

  return `+${digits}`
}

function buildOrderWhatsappMessage(params: {
  eventKey: OrderWhatsappEventKey
  order: OrderForNotification
  tenantName: string
}) {
  const customerName = params.order.customer_name?.trim() || 'cliente'
  const orderRef = `#${params.order.order_number}`
  const greeting = `Olá, ${customerName}!`

  switch (params.eventKey) {
    case 'order_received':
      return `${greeting} Seu pedido ${orderRef} foi recebido pela ${params.tenantName}. Vamos te avisar quando ele avançar.`
    case 'order_confirmed':
      return `${greeting} Seu pedido ${orderRef} foi confirmado pela ${params.tenantName} e já entrou na fila de atendimento.`
    case 'order_preparing':
      return `${greeting} Seu pedido ${orderRef} está em preparo na ${params.tenantName}.`
    case 'order_ready':
      return `${greeting} Seu pedido ${orderRef} está pronto na ${params.tenantName}.`
    case 'order_delivered':
      return `${greeting} Seu pedido ${orderRef} foi finalizado pela ${params.tenantName}. Bom apetite!`
    case 'order_cancelled': {
      const refundNote =
        params.order.payment_status === 'refunded' || params.order.refunded_at
          ? ' O reembolso do pagamento foi solicitado.'
          : ''
      const reasonNote = params.order.cancelled_reason
        ? ` Motivo: ${params.order.cancelled_reason}.`
        : ''
      return `${greeting} Seu pedido ${orderRef} foi cancelado pela ${params.tenantName}.${reasonNote}${refundNote}`
    }
  }
}

async function createNotificationLog(params: {
  orderId: string
  tenantId: string
  eventKey: OrderWhatsappEventKey
  status: 'sent' | 'failed' | 'skipped'
  recipient?: string | null
  providerMessageId?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('order_notifications')
    .insert({
      order_id: params.orderId,
      tenant_id: params.tenantId,
      channel: 'whatsapp',
      event_key: params.eventKey,
      status: params.status,
      recipient: params.recipient ?? null,
      provider_message_id: params.providerMessageId ?? null,
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? {},
    })

  if (error) throw error
}

export async function sendOrderWhatsappNotification(params: {
  orderId: string
  eventKey: OrderWhatsappEventKey
}) {
  const config = getTwilioWhatsappConfig()
  const admin = createAdminClient()

  const { data: existingSent } = await admin
    .from('order_notifications')
    .select('id')
    .eq('order_id', params.orderId)
    .eq('channel', 'whatsapp')
    .eq('event_key', params.eventKey)
    .eq('status', 'sent')
    .maybeSingle()

  if (existingSent) {
    return { sent: false, reason: 'already-sent' as const }
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, tenant_id, order_number, customer_name, customer_phone, status, payment_status, refunded_at, cancelled_reason, total')
    .eq('id', params.orderId)
    .single()

  if (orderError || !order) {
    throw orderError ?? new Error('Pedido não encontrado para notificação WhatsApp.')
  }

  const phone = normalizeBrazilPhone(order.customer_phone)
  if (!phone) {
    await createNotificationLog({
      orderId: order.id,
      tenantId: order.tenant_id,
      eventKey: params.eventKey,
      status: 'skipped',
      errorMessage: 'missing-phone',
    })
    return { sent: false, reason: 'missing-phone' as const }
  }

  if (!config) {
    await createNotificationLog({
      orderId: order.id,
      tenantId: order.tenant_id,
      eventKey: params.eventKey,
      status: 'skipped',
      recipient: phone,
      errorMessage: 'missing-twilio-config',
    })
    return { sent: false, reason: 'missing-config' as const }
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('name')
    .eq('id', order.tenant_id)
    .single()

  const body = buildOrderWhatsappMessage({
    eventKey: params.eventKey,
    order: order as OrderForNotification,
    tenantName: tenant?.name ?? 'estabelecimento',
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: config.from,
        To: `whatsapp:${phone}`,
        Body: body,
      }),
    }
  )

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    await createNotificationLog({
      orderId: order.id,
      tenantId: order.tenant_id,
      eventKey: params.eventKey,
      status: 'failed',
      recipient: phone,
      errorMessage: json?.message || 'twilio-send-failed',
      metadata: {
        status: response.status,
      },
    })
    throw new Error(json?.message || 'Erro ao enviar WhatsApp pelo Twilio.')
  }

  await createNotificationLog({
    orderId: order.id,
    tenantId: order.tenant_id,
    eventKey: params.eventKey,
    status: 'sent',
    recipient: phone,
    providerMessageId: json?.sid ?? null,
  })

  return { sent: true }
}
