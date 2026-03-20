import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { TenantCheckoutList, TenantHistoryList } from './TenantDetailLists'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PLAN_LABELS, type Plan } from '@/features/plans/types'
import { ArrowLeft, CreditCard, History, Store, Wallet } from 'lucide-react'

type AdminTenant = {
  id: string
  name: string
  slug: string
  plan: Plan
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  suspended_at: string | null
  suspension_reason: string | null
  next_billing_at: string | null
  total_users: number
  total_orders: number
  total_revenue: number
  last_order_at: string | null
}

type TenantEvent = {
  id: string
  message: string
  created_at: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export default async function AdminTenantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { id } = await params
  const admin = createAdminClient()

  const [
    { data: tenant },
    { data: paymentAccount },
    { data: checkoutSessions = [] },
    { data: recentOrders = [] },
    { data: events = [] },
  ] = await Promise.all([
    admin
      .from('admin_tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
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
      .limit(20),
    admin
      .from('orders')
      .select('id, status, payment_status, total, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('admin_tenant_events')
      .select('id, event_type, message, metadata, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  if (!tenant) notFound()

  const typedTenant = tenant as AdminTenant
  const typedEvents = events as TenantEvent[]
  const typedCheckoutSessions = checkoutSessions ?? []
  const typedRecentOrders = recentOrders ?? []

  const checkoutSummary = {
    pending: typedCheckoutSessions.filter((session) => session.status === 'pending').length,
    approved: typedCheckoutSessions.filter((session) => session.status === 'approved').length,
    converted: typedCheckoutSessions.filter((session) => session.status === 'converted').length,
    rejected: typedCheckoutSessions.filter((session) => session.status === 'rejected').length,
  }

  const orderSummary = {
    paid: typedRecentOrders.filter((order) => order.payment_status === 'paid').length,
    refunded: typedRecentOrders.filter((order) => order.payment_status === 'refunded').length,
    pending: typedRecentOrders.filter((order) => order.payment_status === 'pending').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/tenants">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{typedTenant.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {typedTenant.slug} · {PLAN_LABELS[typedTenant.plan]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={typedTenant.status === 'active'
            ? 'bg-green-100 text-green-700 hover:bg-green-100'
            : typedTenant.status === 'suspended'
              ? 'bg-red-100 text-red-700 hover:bg-red-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>
            {typedTenant.status === 'active'
              ? 'Ativo'
              : typedTenant.status === 'suspended'
                ? 'Suspenso'
                : 'Inativo'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Usuários</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{typedTenant.total_users}</p>
          <p className="mt-2 text-xs text-slate-400">Cadastrado em {formatDate(typedTenant.created_at)}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Pedidos</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{typedTenant.total_orders}</p>
          <p className="mt-2 text-xs text-slate-400">Último pedido em {formatDate(typedTenant.last_order_at)}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Receita</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{formatCurrency(Number(typedTenant.total_revenue ?? 0))}</p>
          <p className="mt-2 text-xs text-slate-400">Receita acumulada da operação</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Próxima cobrança</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <History className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{formatDate(typedTenant.next_billing_at)}</p>
          <p className="mt-2 text-xs text-slate-400">
            {typedTenant.suspension_reason ? `Motivo da suspensão: ${typedTenant.suspension_reason}` : 'Sem observações administrativas'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Saúde operacional</h2>
              <p className="text-sm text-slate-500">Pagamento, checkout e atividade recente.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Mercado Pago</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {paymentAccount ? 'Conectado' : 'Não conectado'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {paymentAccount
                  ? `${paymentAccount.live_mode ? 'Produção' : 'Teste'} · seller ${paymentAccount.mercado_pago_user_id}`
                  : 'Pagamento online indisponível'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Pedidos online recentes</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {orderSummary.paid} pagos · {orderSummary.refunded} reembolsados
              </p>
              <p className="mt-1 text-sm text-slate-500">{orderSummary.pending} pendentes</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Sessões de checkout</p>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Pendentes</span><span>{checkoutSummary.pending}</span></div>
                <div className="flex justify-between"><span>Aprovadas</span><span>{checkoutSummary.approved}</span></div>
                <div className="flex justify-between"><span>Convertidas</span><span>{checkoutSummary.converted}</span></div>
                <div className="flex justify-between"><span>Rejeitadas</span><span>{checkoutSummary.rejected}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Integração</p>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3"><span>Conectado em</span><span>{formatDate(paymentAccount?.connected_at ?? null)}</span></div>
                <div className="flex justify-between gap-3"><span>Atualizado em</span><span>{formatDate(paymentAccount?.updated_at ?? null)}</span></div>
                <div className="flex justify-between gap-3"><span>Expiração do token</span><span>{formatDate(paymentAccount?.token_expires_at ?? null)}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <TenantCheckoutList checkoutSessions={typedCheckoutSessions} />
          </div>
        </section>
        <TenantHistoryList events={typedEvents} />
      </div>
    </div>
  )
}
