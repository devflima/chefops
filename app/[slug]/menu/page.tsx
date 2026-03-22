import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import MenuClient from './MenuClient'
import {
  normalizePublicMenuItems,
  normalizeTenantDeliverySettings,
} from '@/features/menu/public-menu'

export const dynamic = 'force-dynamic'

const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ table?: string; checkout_session?: string; checkout_result?: string }>
}) {
  const { slug } = await params
  const {
    table: tableToken,
    checkout_session: checkoutSessionId,
    checkout_result: checkoutResult,
  } = await searchParams

  const { data: tenant } = await publicSupabase
    .from('tenants')
    .select('id, name, slug, status, plan, tenant_delivery_settings(delivery_enabled, flat_fee)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!tenant) notFound()

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

  // Normaliza category e extras — Supabase retorna arrays em joins
  const items = normalizePublicMenuItems((rawItems ?? []) as never)

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
        plan: tenant.plan,
        delivery_settings: normalizeTenantDeliverySettings(tenant.tenant_delivery_settings),
      }}
      items={items}
      tableInfo={tableInfo}
      checkoutSessionId={checkoutSessionId ?? null}
      checkoutResult={checkoutResult ?? null}
    />
  )
}
