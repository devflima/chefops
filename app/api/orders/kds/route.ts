import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('kds_orders')
      .select('*, items:order_items(*, extras:order_item_extras(*))')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Filtra itens de cada pedido — só os que vão para cozinha
    const enriched = await Promise.all(
      data.map(async (order) => {
        const kitchenItems = []

        for (const item of order.items ?? []) {
          if (!item.menu_item_id) continue

          const { data: menuItem } = await supabase
            .from('menu_items')
            .select('category:categories(goes_to_kitchen)')
            .eq('id', item.menu_item_id)
            .single()

          const goesToKitchen =
            (menuItem?.category as { goes_to_kitchen: boolean } | null)
              ?.goes_to_kitchen ?? true

          if (goesToKitchen) kitchenItems.push(item)
        }

        return { ...order, items: kitchenItems }
      })
    )

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('[kds:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos da cozinha.' },
      { status: 500 }
    )
  }
}
