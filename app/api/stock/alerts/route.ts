import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('stock_balance')
      .select('*')
      .eq('active', true)
      .filter('current_stock', 'lte', 'min_stock')
      .order('current_stock', { ascending: true })

    if (error) throw error

    const enriched = data.map((item) => ({
      ...item,
      is_low_stock: true,
      deficit: item.min_stock - item.current_stock,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('[alerts:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar alertas.' },
      { status: 500 }
    )
  }
}