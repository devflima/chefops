import { requireTenantRoles } from '@/lib/auth-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrderFromCheckoutSession } from '@/lib/checkout-session'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { profile } = auth
    const { id } = await params
    const admin = createAdminClient()

    const { data: session, error } = await admin
      .from('checkout_sessions')
      .select('id, tenant_id, status, payload, mercado_pago_payment_id, created_order_id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Sessão de checkout não encontrada.' },
        { status: 404 }
      )
    }

    if (session.created_order_id) {
      return NextResponse.json({
        data: {
          checkout_session_id: session.id,
          created_order_id: session.created_order_id,
          status: session.status,
          already_processed: true,
        },
      })
    }

    if (session.status !== 'approved' || !session.mercado_pago_payment_id || !session.payload) {
      return NextResponse.json(
        { error: 'A sessão ainda não está pronta para reprocessamento.' },
        { status: 409 }
      )
    }

    const order = await createOrderFromCheckoutSession({
      checkoutSessionId: session.id,
      payload: session.payload,
      paymentId: String(session.mercado_pago_payment_id),
    })

    return NextResponse.json({
      data: {
        checkout_session_id: session.id,
        created_order_id: order.id,
        order_number: order.order_number,
        status: 'converted',
      },
    })
  } catch (error) {
    console.error('[mercado-pago:checkout-session:reprocess]', error)
    return NextResponse.json(
      { error: 'Erro ao reprocessar checkout.' },
      { status: 500 }
    )
  }
}
