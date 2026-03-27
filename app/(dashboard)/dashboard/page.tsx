import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OnboardingWizard from '@/features/onboarding/components/OnboardingWizard'
import { hasPlanFeature } from '@/features/plans/types'
import {
  ArrowRight,
  Bike,
  ClipboardList,
  Clock3,
  LayoutGrid,
  Package,
  TriangleAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react'

type TenantProfile = {
  full_name: string | null
  tenant_id: string
  tenants: { name: string; plan: 'free' | 'basic' | 'pro' } | null
}

type StockAlert = {
  product_name: string
  current_stock: number
  min_stock: number
  unit: string
}

type DashboardOrder = {
  id: string
  order_number: number
  customer_name: string | null
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method: 'online' | 'table' | 'counter' | 'delivery'
  total: number
  delivery_fee: number | null
  delivery_status: 'waiting_dispatch' | 'assigned' | 'out_for_delivery' | 'delivered' | null
  delivery_driver_id: string | null
  created_at: string
}

const statusLabels: Record<DashboardOrder['status'], string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const deliveryStatusLabels: Record<NonNullable<DashboardOrder['delivery_status']>, string> = {
  waiting_dispatch: 'Aguardando despacho',
  assigned: 'Entregador atribuído',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entrega concluída',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, tenant_id, tenants(name, plan)')
    .eq('id', user!.id)
    .single()

  const normalizedProfile: TenantProfile | null = profile
    ? {
        full_name: profile.full_name,
        tenant_id: profile.tenant_id,
        tenants: Array.isArray(profile.tenants)
          ? (profile.tenants[0] ?? null)
          : (profile.tenants ?? null),
      }
    : null

  const tenantPlan = normalizedProfile?.tenants?.plan ?? 'free'
  const hasStock = hasPlanFeature(tenantPlan, 'stock')
  const hasSales = hasPlanFeature(tenantPlan, 'sales')

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [
    { data: ordersToday },
    { data: stockAlerts },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, customer_name, status, payment_status, payment_method, total, delivery_fee, delivery_status, delivery_driver_id, created_at')
      .eq('tenant_id', normalizedProfile?.tenant_id ?? '')
      .gte('created_at', startOfDay)
      .order('created_at', { ascending: false }),
    hasStock
      ? admin
          .from('stock_balance')
          .select('tenant_id, product_name, current_stock, min_stock, unit, active')
          .eq('tenant_id', normalizedProfile?.tenant_id ?? '')
          .eq('active', true)
          .order('current_stock', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] as StockAlert[] }),
  ])

  const orders = (ordersToday ?? []) as DashboardOrder[]
  const stockLowItems = ((stockAlerts ?? []) as (StockAlert & { active?: boolean })[])
    .filter((item) => Number(item.current_stock) <= Number(item.min_stock))
  const activeOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status))
  const paidOrders = orders.filter((order) => order.payment_status === 'paid' && order.status !== 'cancelled')
  const deliveryOrders = orders.filter((order) => order.payment_method === 'delivery' || order.delivery_fee)
  const paidDeliveryOrders = deliveryOrders.filter(
    (order) => order.payment_status === 'paid' && order.status !== 'cancelled'
  )
  const waitingDispatch = deliveryOrders.filter((order) => order.delivery_status === 'waiting_dispatch').length
  const outForDelivery = deliveryOrders.filter((order) => order.delivery_status === 'out_for_delivery').length
  const deliveryFeeRevenue = paidDeliveryOrders.reduce(
    (sum, order) => sum + Number(order.delivery_fee ?? 0),
    0
  )
  const revenueToday = paidOrders.reduce((sum, order) => sum + Number(order.total), 0)
  const averageTicket = paidOrders.length > 0 ? revenueToday / paidOrders.length : 0

  const topDriverMap = new Map<string, number>()
  for (const order of deliveryOrders) {
    if (!order.delivery_driver_id || order.status !== 'delivered') continue
    topDriverMap.set(order.delivery_driver_id, (topDriverMap.get(order.delivery_driver_id) ?? 0) + 1)
  }

  let topDriverSummary = 'Nenhuma entrega concluída hoje'
  if (topDriverMap.size > 0) {
    const [driverId, count] = [...topDriverMap.entries()].sort((a, b) => b[1] - a[1])[0]
    const { data: driver } = await supabase
      .from('delivery_drivers')
      .select('name')
      .eq('id', driverId)
      .maybeSingle()

    if (driver?.name) {
      topDriverSummary = `${driver.name} com ${count} entrega${count !== 1 ? 's' : ''}`
    }
  }

  const attentionOrders = activeOrders.filter((order) => {
    if (order.status === 'ready') return true
    if (order.delivery_status === 'waiting_dispatch') return true
    return order.status === 'pending'
  }).slice(0, 6)

  const cards = [
    {
      label: 'Pedidos hoje',
      value: String(orders.length),
      hint: `${activeOrders.length} em andamento`,
      icon: ClipboardList,
      tone: 'bg-slate-50 text-slate-700',
    },
    {
      label: 'Faturamento do dia',
      value: formatCurrency(revenueToday),
      hint: hasSales ? `${paidOrders.length} pedidos pagos` : 'Disponível no painel operacional',
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(averageTicket),
      hint: paidOrders.length > 0 ? `${paidOrders.length} vendas concluídas` : 'Ainda sem vendas concluídas',
      icon: TrendingUp,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Delivery hoje',
      value: String(deliveryOrders.length),
      hint: `${waitingDispatch} aguardando despacho`,
      icon: Bike,
      tone: 'bg-orange-50 text-orange-700',
    },
  ]

  const quickActions = [
    { href: '/pedidos', label: 'Ver pedidos', icon: ClipboardList },
    { href: '/entregadores', label: 'Gerir entregadores', icon: Bike },
    { href: '/mesas', label: 'Abrir mesas', icon: LayoutGrid },
    { href: '/estoque', label: 'Checar estoque', icon: Package },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Olá, {normalizedProfile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-slate-500">
          Visão rápida da operação do{' '}
          <span className="font-medium text-slate-700">
            {normalizedProfile?.tenants?.name}
          </span>{' '}
          hoje.
        </p>
      </div>

      <OnboardingWizard />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <div className={`rounded-xl p-2 ${tone}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Operação de delivery</h2>
              <p className="mt-1 text-sm text-slate-500">
                Acompanhe despacho, rota e arrecadação de taxa de entrega.
              </p>
            </div>
            <Link
              href="/pedidos"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Abrir pedidos
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Taxa de entrega arrecadada</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(deliveryFeeRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Somatório das taxas cobradas nos pedidos de delivery do dia.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Despacho e rota</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Aguardando despacho</span>
                  <span className="font-semibold text-slate-900">{waitingDispatch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Saiu para entrega</span>
                  <span className="font-semibold text-slate-900">{outForDelivery}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Top entregador</span>
                  <span className="font-medium text-slate-900 text-right">{topDriverSummary}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Pedidos que exigem atenção</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Priorize o que está esperando confirmação, despacho ou finalização.
                  </p>
                </div>
                <TriangleAlert className="h-5 w-5 text-amber-500" />
              </div>

              {attentionOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  Nada crítico no momento. A operação está fluindo bem.
                </div>
              ) : (
                <div className="space-y-3">
                  {attentionOrders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            #{order.order_number} {order.customer_name ? `· ${order.customer_name}` : ''}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {statusLabels[order.status]}
                            {order.delivery_status
                              ? ` · ${deliveryStatusLabels[order.delivery_status]}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(Number(order.total))}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Estoque e alertas</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Visão rápida dos pontos que podem impactar o atendimento.
                  </p>
                </div>
                <Clock3 className="h-5 w-5 text-slate-400" />
              </div>

              {!hasStock ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  O controle de estoque completo está disponível a partir do plano Standard.
                </div>
              ) : stockLowItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  Nenhum item com estoque crítico agora.
                </div>
              ) : (
                <div className="space-y-3">
                  {stockLowItems.map((item) => (
                    <div key={item.product_name} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-amber-900">{item.product_name}</p>
                          <p className="mt-1 text-xs text-amber-700">
                            Atual: {Number(item.current_stock).toFixed(3)} {item.unit} · Mínimo: {Number(item.min_stock).toFixed(3)} {item.unit}
                          </p>
                        </div>
                        <TriangleAlert className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Ações rápidas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Atalhos para as áreas que você mais usa na operação.
              </p>

              <div className="mt-5 grid gap-3">
                {quickActions.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-900">{label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
