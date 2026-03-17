import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params

    // Busca tenant pelo slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Estabelecimento não encontrado.' },
        { status: 404 }
      )
    }

    // Busca itens do cardápio agrupados por categoria
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*, category:categories(id, name)')
      .eq('tenant_id', tenant.id)
      .eq('available', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    // Agrupa por categoria
    const grouped = items.reduce(
      (
        acc: Record<
          string,
          { category: { id: string; name: string } | null; items: typeof items }
        >,
        item
      ) => {
        const key = item.category_id ?? 'sem-categoria'
        if (!acc[key]) {
          acc[key] = { category: item.category ?? null, items: [] }
        }
        acc[key].items.push(item)
        return acc
      },
      {}
    )

    return NextResponse.json({
      data: {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        menu: Object.values(grouped),
      },
    })
  } catch (error) {
    console.error('[menu:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cardápio.' },
      { status: 500 }
    )
  }
}
