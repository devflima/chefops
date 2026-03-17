import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category_id = searchParams.get('category_id') || ''
    const search = searchParams.get('search') || ''
    const only_active = searchParams.get('only_active') !== 'false'

    let query = supabase
      .from('stock_balance')
      .select('*')
      .order('product_name', { ascending: true })

    if (only_active) query = query.eq('active', true)
    if (search) query = query.ilike('product_name', `%${search}%`)

    const { data, error } = await query

    if (error) throw error

    // Adiciona flag is_low_stock
    const enriched = data.map((item) => ({
      ...item,
      is_low_stock: item.current_stock <= item.min_stock,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('[balance:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar saldo.' },
      { status: 500 }
    )
  }
}