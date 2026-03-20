import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return user
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const [
      { data: paymentAccount },
      { data: checkoutSessions = [] },
      { data: recentOrders = [] },
    ] = await Promise.all([
      admin
        .from('tenant_payment_accounts')
        .select('provider, mercado_pago_user_id, status, live_mode, token_expires_at, connected_at, updated_at')
        .eq('tenant_id', id)
        .eq('provider', 'mercado_pago')
        .maybeSingle(),
      admin
        .from('checkout_sessions')
        .select('id, status, amount, mercado_pago_payment_id, created_order_id, created_at, paid_at, converted_at')
        .eq('tenant_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('orders')
        .select('id, status, payment_status, total, created_at')
        .eq('tenant_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const sessions = checkoutSessions ?? []
    const orders = recentOrders ?? []

    const checkoutSummary = {
      pending: sessions.filter((session) => session.status === 'pending').length,
      approved: sessions.filter((session) => session.status === 'approved').length,
      converted: sessions.filter((session) => session.status === 'converted').length,
      rejected: sessions.filter((session) => session.status === 'rejected').length,
    }

    const orderSummary = {
      paid: orders.filter((order) => order.payment_status === 'paid').length,
      refunded: orders.filter((order) => order.payment_status === 'refunded').length,
      pending: orders.filter((order) => order.payment_status === 'pending').length,
    }

    return NextResponse.json({
      data: {
        payment_account: paymentAccount,
        checkout_summary: checkoutSummary,
        order_summary: orderSummary,
        recent_checkout_sessions: sessions,
      },
    })
  } catch (error) {
    console.error('[admin:tenant-health:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar saúde operacional do tenant.' },
      { status: 500 }
    )
  }
}
