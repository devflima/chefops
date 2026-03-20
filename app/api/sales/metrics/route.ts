import { requireTenantFeature } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantFeature('sales', ['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { searchParams } = new URL(request.url)

    const period = searchParams.get('period') || 'today'

    const now = new Date()
    let from: string
    let to: string = now.toISOString()

    if (period === 'today') {
      from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString()
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    } else if (period === 'custom') {
      from = searchParams.get('from') || to
      to = searchParams.get('to') || to
    } else {
      from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString()
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, total, payment_status, created_at')
      .eq('tenant_id', profile.tenant_id)
      .gte('created_at', from)
      .lte('created_at', to)

    if (error) throw error

    const total_orders = orders.length
    const delivered = orders.filter((o) => o.status === 'delivered')
    const cancelled = orders.filter((o) => o.status === 'cancelled')
    const pending = orders.filter((o) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    )
    const revenue = delivered
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total), 0)

    const average_ticket = delivered.length > 0 ? revenue / delivered.length : 0

    return NextResponse.json({
      data: {
        period,
        from,
        to,
        total_orders,
        delivered: delivered.length,
        cancelled: cancelled.length,
        pending: pending.length,
        revenue,
        average_ticket,
        cancellation_rate:
          total_orders > 0
            ? Math.round((cancelled.length / total_orders) * 100)
            : 0,
      },
    })
  } catch (error) {
    console.error('[metrics:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar métricas.' },
      { status: 500 }
    )
  }
}
