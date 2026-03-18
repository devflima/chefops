import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import MenuClient from './MenuCliente'
import type { MenuItem } from '@/features/orders/types'

export const dynamic = 'force-dynamic'

// Cliente público sem autenticação — sem cookies, sem RLS de usuário
const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ table?: string }>
}) {
  const { slug } = await params
  const { table: tableToken } = await searchParams

  const { data: tenant } = await publicSupabase
    .from('tenants')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!tenant) notFound()

  const { data: items } = await publicSupabase
    .from('menu_items')
    .select('*, category:categories(id, name)')
    .eq('tenant_id', tenant.id)
    .eq('available', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })
    .returns<MenuItem[]>()

  let tableInfo: { id: string; number: string } | null = null

  if (tableToken) {
    const { data: qrcode } = await publicSupabase
      .from('table_qrcodes')
      .select('table_id, table:tables(id, number)')
      .eq('token', tableToken)
      .single()

    if (qrcode?.table) {
      const table = Array.isArray(qrcode.table)
        ? qrcode.table[0]
        : qrcode.table
      tableInfo = table as { id: string; number: string }
    }
  }

  return (
    <MenuClient
      tenant={tenant}
      items={items ?? []}
      tableInfo={tableInfo}
    />
  )
}