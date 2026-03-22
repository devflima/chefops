import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LABELS } from '@/features/plans/types'
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  buildAdminOverview,
  formatCurrency,
  formatDate,
  formatDelta,
  type AdminTenantRow,
  type OrderRow,
  type PaymentAccountRow,
  type SaasBillingSubscriptionRow,
  type TenantRow,
} from '@/features/admin/admin-page'

export default async function AdminPage() {
  const admin = createAdminClient()
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const [
    { data: tenants = [] },
    { data: orders = [] },
    { data: accounts = [] },
    { data: adminTenants = [] },
    { data: saasSubscriptions = [] },
  ] = await Promise.all([
    admin
      .from('tenants')
      .select('id, name, slug, plan, status, created_at, next_billing_at')
      .order('created_at', { ascending: false }),
    admin
      .from('orders')
      .select('total, created_at, payment_status'),
    admin
      .from('tenant_payment_accounts')
      .select('tenant_id, status, live_mode')
      .eq('provider', 'mercado_pago'),
    admin
      .from('admin_tenants')
      .select('id, name, slug, plan, status, total_users, total_orders, total_revenue, next_billing_at, last_order_at')
      .order('created_at', { ascending: false })
      .limit(6),
    admin
      .from('saas_billing_subscriptions')
      .select('tenant_id, plan, status, next_payment_date, cancel_at_period_end, scheduled_plan')
      .order('created_at', { ascending: false }),
  ])

  const typedTenants = tenants as TenantRow[]
  const typedOrders = orders as OrderRow[]
  const typedAccounts = accounts as PaymentAccountRow[]
  const typedAdminTenants = adminTenants as AdminTenantRow[]
  const typedSaasSubscriptions = saasSubscriptions as SaasBillingSubscriptionRow[]

  const {
    activeTenants,
    suspendedTenants,
    newTenants30d,
    previousNewTenants,
    paidOrders30d,
    previousRevenue,
    revenue30d,
    connectedAccounts,
    liveAccounts,
    connectedTenantIds,
    upcomingBilling,
    overdueBilling,
    mrrEstimate,
    planCounts,
    tenantsWithoutPayments,
    activePaidTenants,
    basicPlanTenants,
    upgradeCandidates,
    attentionTenants,
    activeSaasSubscriptions,
    pendingSaasSubscriptions,
    cancelAtPeriodEndSubscriptions,
    scheduledPlanChanges,
    centralBillingConfigured,
    centralBillingEnvironment,
    billingHostname,
    centralBillingReadiness,
  } = buildAdminOverview({
    now,
    tenants: typedTenants,
    orders: typedOrders,
    accounts: typedAccounts,
    adminTenants: typedAdminTenants,
    saasSubscriptions: typedSaasSubscriptions,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    hasCentralToken: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
    hasWebhookSecret: Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET),
  })

  const topCards = [
    {
      label: 'Estabelecimentos ativos',
      value: activeTenants.length,
      helper: `${typedTenants.length} no total`,
      delta: formatDelta(activeTenants.length, Math.max(activeTenants.length - newTenants30d.length, 0)),
      icon: Store,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Novos nos últimos 30 dias',
      value: newTenants30d.length,
      helper: `${formatDelta(newTenants30d.length, previousNewTenants.length)} vs período anterior`,
      delta: `${previousNewTenants.length} no período anterior`,
      icon: Building2,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'MRR estimado',
      value: formatCurrency(mrrEstimate),
      helper: 'Baseado nos planos ativos',
      delta: `${activeTenants.filter((tenant) => tenant.plan !== 'free').length} pagantes`,
      icon: Wallet,
      tone: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Receita de pedidos em 30 dias',
      value: formatCurrency(revenue30d),
      helper: `${formatDelta(revenue30d, previousRevenue)} vs período anterior`,
      delta: `${paidOrders30d.length} pedidos pagos`,
      icon: TrendingUp,
      tone: 'bg-amber-50 text-amber-700',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Visão geral</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saúde da base, cobrança e crescimento do ChefOps.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Atualizado agora</p>
          <p className="text-sm font-medium text-slate-700">
            {now.toLocaleDateString('pt-BR')} às {now.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topCards.map(({ label, value, helper, delta, icon: Icon, tone }) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-slate-500">{helper}</p>
            <p className="mt-2 text-xs font-medium text-slate-400">{delta}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Saúde comercial</h2>
              <p className="text-sm text-slate-500">Cobrança, assinaturas SaaS e conexões de pagamento.</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-300" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <CreditCard className="h-4 w-4" />
                <p className="text-sm font-medium">Cobrança</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Próximas em 7 dias</span>
                  <span className="font-semibold text-slate-900">{upcomingBilling.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Atrasadas</span>
                  <span className={`font-semibold ${overdueBilling.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {overdueBilling.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Suspensos</span>
                  <span className={`font-semibold ${suspendedTenants.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {suspendedTenants.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-medium">Billing SaaS</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Conta central</span>
                  <span className={`font-semibold ${centralBillingConfigured ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {centralBillingConfigured ? 'Configurada' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ambiente</span>
                  <span className="font-semibold text-slate-900">{centralBillingEnvironment}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assinaturas ativas</span>
                  <span className="font-semibold text-slate-900">{activeSaasSubscriptions.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <Wallet className="h-4 w-4" />
                <p className="text-sm font-medium">Mercado Pago</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Conectados</span>
                  <span className="font-semibold text-slate-900">{connectedAccounts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Em produção</span>
                  <span className="font-semibold text-slate-900">{liveAccounts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sem conexão</span>
                  <span className={`font-semibold ${tenantsWithoutPayments.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {tenantsWithoutPayments.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <CalendarClock className="h-4 w-4" />
                <p className="text-sm font-medium">Conversão e expansão</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Base no plano Basic</span>
                  <span className="font-semibold text-slate-900">
                    {basicPlanTenants.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pagantes ativos</span>
                  <span className="font-semibold text-slate-900">
                    {activePaidTenants.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Prontos para upgrade</span>
                  <span className={`font-semibold ${upgradeCandidates.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {upgradeCandidates.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-medium">Distribuição por plano</p>
              </div>
              <div className="space-y-3 text-sm">
                {([
                  ['free', planCounts.free],
                  ['basic', planCounts.basic],
                  ['pro', planCounts.pro],
                ] as const).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-slate-500">{PLAN_LABELS[plan]}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Conta central de cobrança</h3>
                  <p className="text-xs text-slate-500">
                    Standard e Premium são cobrados por uma conta Mercado Pago única da plataforma.
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  centralBillingConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {centralBillingConfigured ? 'Pronta para cobrar' : 'Requer configuração'}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                Ambiente atual: <span className="font-medium text-slate-900">{centralBillingEnvironment}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Domínio público: <span className="font-medium text-slate-900">{billingHostname}</span>
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {centralBillingReadiness.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className={`mt-1 text-sm font-semibold ${item.ready ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {item.ready ? 'OK' : 'Pendente'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <CreditCard className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-slate-900">Assinaturas SaaS</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Autorizadas</span>
                  <span className="font-semibold text-slate-900">{activeSaasSubscriptions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pendentes</span>
                  <span className="font-semibold text-slate-900">{pendingSaasSubscriptions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Cancelam no próximo ciclo</span>
                  <span className="font-semibold text-slate-900">{cancelAtPeriodEndSubscriptions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trocas programadas</span>
                  <span className="font-semibold text-slate-900">{scheduledPlanChanges.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Exigem atenção</h2>
              <p className="text-sm text-slate-500">Cobrança, suspensão ou pagamento não configurado.</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {attentionTenants.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                <p className="font-medium text-emerald-700">Nenhum alerta importante no momento.</p>
                <p className="mt-1 text-sm text-emerald-600">A base está saudável e sem pendências críticas.</p>
              </div>
            ) : (
              attentionTenants.slice(0, 5).map((tenant) => {
                const hasPaymentConnection = connectedTenantIds.has(tenant.id)
                const billingDelayed = tenant.next_billing_at ? new Date(tenant.next_billing_at) < today : false
                return (
                  <div
                    key={tenant.id}
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{tenant.name}</p>
                        <p className="text-xs text-slate-400">{tenant.slug}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {PLAN_LABELS[tenant.plan]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {!hasPaymentConnection && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                          Sem Mercado Pago conectado
                        </span>
                      )}
                      {billingDelayed && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                          Cobrança atrasada
                        </span>
                      )}
                      {tenant.status === 'suspended' && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                          Suspenso
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Clientes recentes</h2>
            <p className="text-sm text-slate-500">Últimos estabelecimentos e atividade mais recente.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Estabelecimento</th>
                <th className="pb-3 font-medium">Plano</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Usuários</th>
                <th className="pb-3 font-medium">Pedidos</th>
                <th className="pb-3 font-medium">Receita</th>
                <th className="pb-3 font-medium">Último pedido</th>
                <th className="pb-3 font-medium">Próx. cobrança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {typedAdminTenants.map((tenant) => (
                <tr key={tenant.id} className="text-slate-600">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{tenant.name}</p>
                    <p className="text-xs text-slate-400">{tenant.slug}</p>
                  </td>
                  <td className="py-3 pr-4">{PLAN_LABELS[tenant.plan]}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      tenant.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : tenant.status === 'suspended'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tenant.status === 'active'
                        ? 'Ativo'
                        : tenant.status === 'suspended'
                          ? 'Suspenso'
                          : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{tenant.total_users}</td>
                  <td className="py-3 pr-4">{tenant.total_orders}</td>
                  <td className="py-3 pr-4">{formatCurrency(Number(tenant.total_revenue ?? 0))}</td>
                  <td className="py-3 pr-4">{formatDate(tenant.last_order_at)}</td>
                  <td className="py-3">{formatDate(tenant.next_billing_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
