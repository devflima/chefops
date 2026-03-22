import { createAdminClient } from '@/lib/supabase/admin'
import { refundPaymentById } from '@/lib/mercadopago'
import { getTenantMercadoPagoAccessToken } from '@/lib/tenant-mercadopago'

type RefundDeps = {
  admin: ReturnType<typeof createAdminClient>
  refundPaymentById: typeof refundPaymentById
  getTenantMercadoPagoAccessToken: typeof getTenantMercadoPagoAccessToken
}

export async function refundOrderIfNeededWithDeps(orderId: string, deps: RefundDeps) {
  const { admin } = deps

  const { data: order, error } = await admin
    .from('orders')
    .select('id, tenant_id, total, payment_status, payment_provider, payment_transaction_id, refunded_at')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw error ?? new Error('Pedido não encontrado para reembolso.')
  }

  if (order.payment_status !== 'paid' || order.refunded_at) {
    return { refunded: false, reason: 'not-paid-or-already-refunded' }
  }

  if (order.payment_provider !== 'mercado_pago' || !order.payment_transaction_id) {
    return { refunded: false, reason: 'unsupported-provider' }
  }

  const accessToken = await deps.getTenantMercadoPagoAccessToken(order.tenant_id)

  if (!accessToken) {
    throw new Error('Mercado Pago não conectado para este estabelecimento.')
  }

  await deps.refundPaymentById({
    paymentId: order.payment_transaction_id,
    accessToken,
  })

  const { error: updateError } = await admin
    .from('orders')
    .update({
      payment_status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) throw updateError

  return { refunded: true }
}

export async function refundOrderIfNeeded(orderId: string) {
  return refundOrderIfNeededWithDeps(orderId, {
    admin: createAdminClient(),
    refundPaymentById,
    getTenantMercadoPagoAccessToken,
  })
}
