import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import MenuClient from './MenuClient'

export const dynamic = 'force-dynamic'

const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RawExtra = {
  extra: { id: string; name: string; price: number; category: string } | { id: string; name: string; price: number; category: string }[] | null
}

type RawItem = {
  id: string
  tenant_id: string
  product_id: string | null
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  available: boolean
  display_order: number
  created_at: string
  updated_at: string
  category: { id: string; name: string } | { id: string; name: string }[] | null
  extras: RawExtra[]
}

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
  const items = ((rawItems ?? []) as RawItem[]).map((item) => {
    const cat = Array.isArray(item.category)
      ? (item.category[0] ?? null)
      : (item.category ?? null)

    const extras = (item.extras ?? []).map((e) => {
      const extra = Array.isArray(e.extra)
        ? (e.extra[0] ?? null)
        : (e.extra ?? null)
      return { extra }
    }).filter((e) => e.extra !== null)

    return { ...item, category: cat, extras }
  })

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
        delivery_settings: Array.isArray(tenant.tenant_delivery_settings)
          ? (tenant.tenant_delivery_settings[0] ?? null)
          : (tenant.tenant_delivery_settings ?? null),
      }}
      items={items}
      tableInfo={tableInfo}
      checkoutSessionId={checkoutSessionId ?? null}
      checkoutResult={checkoutResult ?? null}
    />
  )
}
