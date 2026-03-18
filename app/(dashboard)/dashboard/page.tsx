import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from '@/features/onboarding/components/OnboardingWizard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, tenants(name)')
    .eq('id', user!.id)
    .single()

  const [{ count: totalProducts }, { data: balances }, { count: movementsToday }] =
    await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('stock_balance').select('current_stock, min_stock').eq('active', true),
      supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ])

  const lowStockCount = balances?.filter((b) => b.current_stock <= b.min_stock).length ?? 0

  const cards = [
    { label: 'Produtos ativos',         value: totalProducts ?? 0 },
    { label: 'Itens com estoque baixo', value: lowStockCount },
    { label: 'Movimentações hoje',      value: movementsToday ?? 0 },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Olá, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Bem-vindo ao painel do{' '}
          <span className="font-medium text-slate-700">
            {(profile?.tenants as { name: string } | null)?.name}
          </span>
        </p>
      </div>

      <OnboardingWizard />

      <div className="grid grid-cols-3 gap-4">
        {cards.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}