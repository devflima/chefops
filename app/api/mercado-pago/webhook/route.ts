import { createAdminClient } from '@/lib/supabase/admin'
import { createOrderFromCheckoutSession } from '@/lib/checkout-session'
import {
  getCheckoutSessionIdFromExternalReference,
  getOrderIdFromExternalReference,
  getPaymentById,
  mapMercadoPagoStatusToOrderPaymentStatus,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/mercadopago'
import { getMercadoPagoAccessTokenBySellerUserId } from '@/lib/tenant-mercadopago'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const type = body?.type || request.nextUrl.searchParams.get('topic')
    const dataId = String(
      body?.data?.id || request.nextUrl.searchParams.get('data.id') || body?.id || ''
    )

    if (!verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId,
    })) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
    }

    if (type !== 'payment' || !dataId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const sellerAccessToken = await getMercadoPagoAccessTokenBySellerUserId(body?.user_id)
    const payment = await getPaymentById(dataId, sellerAccessToken)
    const orderId =
      payment.metadata?.order_id || getOrderIdFromExternalReference(payment.external_reference)
    const checkoutSessionId =
      payment.metadata?.checkout_session_id ||
      getCheckoutSessionIdFromExternalReference(payment.external_reference)

    const admin = createAdminClient()
    const paymentStatus = mapMercadoPagoStatusToOrderPaymentStatus(payment.status)

    if (orderId) {
      const { error } = await admin
        .from('orders')
        .update({
          payment_status: paymentStatus,
        })
        .eq('id', orderId)

      if (error) throw error
    }

    if (checkoutSessionId) {
      const { data: checkoutSession, error: checkoutError } = await admin
        .from('checkout_sessions')
        .select('*')
        .eq('id', checkoutSessionId)
        .single()

      if (checkoutError || !checkoutSession) {
        throw checkoutError ?? new Error('Sessão de checkout não encontrada.')
      }

      const { error: sessionUpdateError } = await admin
        .from('checkout_sessions')
        .update({
          status: payment.status === 'approved' ? 'approved' : payment.status,
          mercado_pago_payment_id: String(payment.id),
          paid_at: payment.date_approved ?? payment.date_last_updated ?? null,
        })
        .eq('id', checkoutSessionId)

      if (sessionUpdateError) throw sessionUpdateError

      if (payment.status === 'approved' && !checkoutSession.created_order_id) {
        await createOrderFromCheckoutSession({
          checkoutSessionId,
          payload: checkoutSession.payload,
        })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[mercado-pago:webhook]', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook do Mercado Pago.' },
      { status: 500 }
    )
  }
}
