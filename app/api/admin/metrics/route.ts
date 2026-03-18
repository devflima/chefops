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

export async function GET() {
  try {
    const user = await verifyAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const admin = createAdminClient()

    const [
      { count: totalTenants },
      { count: activeTenants },
      { count: suspendedTenants },
      { data: planCounts },
      { data: revenueData },
    ] = await Promise.all([
      admin.from('tenants').select('*', { count: 'exact', head: true }),
      admin.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
      admin.from('tenants').select('plan'),
      admin.from('orders').select('total').eq('payment_status', 'paid'),
    ])

    const byPlan = {
      free:  planCounts?.filter((t) => t.plan === 'free').length ?? 0,
      basic: planCounts?.filter((t) => t.plan === 'basic').length ?? 0,
      pro:   planCounts?.filter((t) => t.plan === 'pro').length ?? 0,
    }

    const totalRevenue = revenueData?.reduce(
      (sum, o) => sum + Number(o.total), 0
    ) ?? 0

    return NextResponse.json({
      data: {
        total_tenants:     totalTenants ?? 0,
        active_tenants:    activeTenants ?? 0,
        suspended_tenants: suspendedTenants ?? 0,
        by_plan:           byPlan,
        total_revenue:     totalRevenue,
      },
    })
  } catch (error) {
    console.error('[admin:metrics:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar métricas.' },
      { status: 500 }
    )
  }
}