import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import MenuClient from './MenuClient'
import { ensureTenantBillingAccessState } from '@/lib/saas-billing'
import {
  applyAutomaticBorderExtras,
  normalizePublicMenuItems,
  normalizeTenantDeliverySettings,
} from '@/features/menu/public-menu'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type PublicTenantQuery = {
  select: (columns: string) => PublicTenantQuery
  eq: (column: string, value: string) => PublicTenantQuery
  single: () => Promise<{ data: unknown; error: { message?: string } | null }>
}

type PublicTenantClient = {
  from: (table: string) => PublicTenantQuery
}

type PublicTenant = {
  id: string
  name: string
  slug: string
  plan: string
  tenant_delivery_settings?: Parameters<typeof normalizeTenantDeliverySettings>[0]
}

const TENANT_FULL_SELECT =
  'id, name, slug, status, plan, tenant_delivery_settings(delivery_enabled, flat_fee, accepting_orders, schedule_enabled, opens_at, closes_at, pricing_mode, max_radius_km, fee_per_km, origin_zip_code, origin_street, origin_number, origin_neighborhood, origin_city, origin_state)'
const TENANT_LEGACY_SELECT =
  'id, name, slug, status, plan, tenant_delivery_settings(delivery_enabled, flat_fee, accepting_orders, schedule_enabled, opens_at, closes_at)'
const TENANT_CORE_SELECT = 'id, name, slug, status, plan'

async function fetchPublicTenant(
  publicSupabase: PublicTenantClient,
  slug: string,
) {
  const selectVariants = [TENANT_FULL_SELECT, TENANT_LEGACY_SELECT, TENANT_CORE_SELECT]
  let lastError: { message?: string } | null = null

  for (const select of selectVariants) {
    const { data, error } = await publicSupabase
      .from('tenants')
      .select(select)
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (data) {
      return { tenant: data as PublicTenant, tenantError: null }
    }

    if (!error) {
      return { tenant: null, tenantError: null }
    }

    lastError = error
  }

  return { tenant: null, tenantError: lastError }
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ table?: string; checkout_session?: string; checkout_result?: string }>
}) {
  const { slug } = await params

  const hasAnonCredentials =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const hasServiceRole =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!hasAnonCredentials && !hasServiceRole) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-slate-900 shadow-sm">
          <h1 className="text-lg font-semibold">Cardápio indisponível no ambiente atual</h1>
          <p className="mt-2 text-sm text-slate-700">
            Configure NEXT_PUBLIC_SUPABASE_URL com NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY para carregar o cardápio público.
          </p>
        </div>
      </main>
    )
  }

  const publicSupabase = hasServiceRole
    ? createAdminClient()
    : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const {
    table: tableToken,
    checkout_session: checkoutSessionId,
    checkout_result: checkoutResult,
  } = await searchParams

  const { tenant, tenantError } = await fetchPublicTenant(publicSupabase as unknown as PublicTenantClient, slug)

  if (tenantError) {
    console.error('[menu:page]', tenantError)
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-slate-900 shadow-sm">
          <h1 className="text-lg font-semibold">Cardápio temporariamente indisponível</h1>
          <p className="mt-2 text-sm text-slate-700">
            Não conseguimos carregar os dados públicos do estabelecimento neste ambiente.
          </p>
        </div>
      </main>
    )
  }

  if (!tenant) notFound()

  const billingState = await ensureTenantBillingAccessState(tenant.id)
  const effectivePlan = billingState.downgraded ? 'free' : tenant.plan

  const { data: rawItems } = await publicSupabase
    .from('menu_items')
    .select(`
      id, tenant_id, product_id, category_id, name, description,
      price, image_url, available, display_order, created_at, updated_at,
      category:categories(id, name),
      extras:menu_item_extras(
        extra:extras(id, name, price, category)
      )
    `)
    .eq('tenant_id', tenant.id)
    .eq('available', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: rawBorderExtras } = await publicSupabase
    .from('extras')
    .select('id, name, price, category')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .eq('category', 'border')
    .order('name', { ascending: true })

  const items = applyAutomaticBorderExtras(
    normalizePublicMenuItems((rawItems ?? []) as never),
    (rawBorderExtras ?? []) as never,
  )

  let tableInfo: { id: string; number: string } | null = null

  if (tableToken) {
    const { data: qrcode } = await publicSupabase
      .from('table_qrcodes')
      .select('table_id, table:tables(id, number)')
      .eq('token', tableToken)
      .single()

    if (qrcode?.table) {
      const table = Array.isArray(qrcode.table) ? qrcode.table[0] : qrcode.table
      tableInfo = table as { id: string; number: string }
    }
  }

  return (
    <MenuClient
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: effectivePlan,
        delivery_settings: normalizeTenantDeliverySettings(tenant.tenant_delivery_settings ?? null),
      }}
      items={items}
      tableInfo={tableInfo}
      checkoutSessionId={checkoutSessionId ?? null}
      checkoutResult={checkoutResult ?? null}
    />
  )
}
