import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuClient from './MenuCliente'

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ table?: string }>
}) {
  const { slug } = await params
  const { table: tableToken } = await searchParams
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!tenant) notFound()

  const { data: items } = await supabase
    .from('menu_items')
    .select('*, category:categories(id, name)')
    .eq('tenant_id', tenant.id)
    .eq('available', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  // Resolve mesa pelo token do QR Code
  let tableInfo: { id: string; number: string } | null = null

  if (tableToken) {
    const { data: qrcode } = await supabase
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
    <MenuClient tenant={tenant} items={items ?? []} tableInfo={tableInfo} />
  )
}
