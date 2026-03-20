import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Building2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default async function AdminPage() {
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

  const cards = [
    {
      label: 'Total de estabelecimentos',
      value: totalTenants ?? 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Estabelecimentos ativos',
      value: activeTenants ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Suspensos',
      value: suspendedTenants ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Receita total (pedidos)',
      value: `R$ ${totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Visão geral</h1>
        <p className="text-slate-500 text-sm mt-1">Monitoramento de todos os estabelecimentos</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">{label}</p>
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Distribuição por plano */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-medium text-slate-900 mb-4">Distribuição por plano</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { plan: 'Basic',    count: byPlan.free,  color: 'bg-slate-100 text-slate-700' },
            { plan: 'Standard', count: byPlan.basic, color: 'bg-blue-100 text-blue-700' },
            { plan: 'Premium',  count: byPlan.pro,   color: 'bg-purple-100 text-purple-700' },
          ].map(({ plan, count, color }) => (
            <div key={plan} className={`${color} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm font-medium mt-1">{plan}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
