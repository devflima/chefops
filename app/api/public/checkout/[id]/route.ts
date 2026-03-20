import { createAdminClient } from '@/lib/supabase/admin'
import { createOrderFromCheckoutSession } from '@/lib/checkout-session'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createAdminClient()
    const { id } = await params

    const { data, error } = await admin
      .from('checkout_sessions')
      .select('id, status, payload, mercado_pago_payment_id, created_order_id, created_order:orders(id, order_number, status, payment_status)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Sessão de checkout não encontrada.' },
        { status: 404 }
      )
    }

    if (
      data.status === 'approved' &&
      !data.created_order_id &&
      data.payload &&
      data.mercado_pago_payment_id
    ) {
      try {
        await createOrderFromCheckoutSession({
          checkoutSessionId: data.id,
          payload: data.payload,
          paymentId: String(data.mercado_pago_payment_id),
        })
      } catch (conversionError) {
        console.warn('[public-checkout:get:auto-convert]', {
          checkoutSessionId: data.id,
          error: conversionError instanceof Error ? conversionError.message : conversionError,
        })
      }
    }

    const { data: refreshed, error: refreshError } = await admin
      .from('checkout_sessions')
      .select('id, status, created_order_id, created_order:orders(id, order_number, status, payment_status)')
      .eq('id', id)
      .single()

    if (refreshError || !refreshed) {
      return NextResponse.json(
        { error: 'Sessão de checkout não encontrada.' },
        { status: 404 }
      )
    }

    const order = Array.isArray(refreshed.created_order)
      ? refreshed.created_order[0]
      : refreshed.created_order

    return NextResponse.json({
      data: {
        id: refreshed.id,
        status: refreshed.status,
        created_order_id: refreshed.created_order_id,
        order_number: order?.order_number ?? null,
        order_status: order?.status ?? null,
        payment_status: order?.payment_status ?? null,
      },
    })
  } catch (error) {
    console.error('[public-checkout:get]', error)
    return NextResponse.json(
      { error: 'Erro ao consultar checkout.' },
      { status: 500 }
    )
  }
}
