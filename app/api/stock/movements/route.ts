import { requireTenantFeature } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const movementSchema = z.object({
  product_id: z.string().uuid('Produto inválido'),
  type: z.enum(['entry', 'exit', 'loss', 'adjustment']),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantFeature('stock', ['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { searchParams } = new URL(request.url)

    const product_id = searchParams.get('product_id') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const rangeFrom = (page - 1) * pageSize
    const rangeTo = rangeFrom + pageSize - 1

    let query = supabase
      .from('stock_movements')
      .select('*, product:products(id, name, unit)', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if (product_id) query = query.eq('product_id', product_id)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, count, page, pageSize })
  } catch (error) {
    console.error('[movements:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar movimentações.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantFeature('stock', ['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile, user } = auth
    const body = await request.json()
    const parsed = movementSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Valida saldo para saídas e perdas
    if (['exit', 'loss'].includes(parsed.data.type)) {
      const { data: balance } = await supabase
        .from('stock_balance')
        .select('current_stock')
        .eq('product_id', parsed.data.product_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!balance || balance.current_stock < parsed.data.quantity) {
        return NextResponse.json(
          { error: 'Saldo insuficiente para esta movimentação.' },
          { status: 422 }
        )
      }
    }

    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        ...parsed.data,
        tenant_id: profile.tenant_id,
        user_id: user.id,
      })
      .select('*, product:products(id, name, unit)')
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[movements:post]', error)
    return NextResponse.json(
      { error: 'Erro ao registrar movimentação.' },
      { status: 500 }
    )
  }
}
