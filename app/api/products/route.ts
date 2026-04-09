import { requireTenantRoles } from '@/lib/auth-guards'
import { getPersistedTenantPlanSnapshot } from '@/lib/tenant-plan'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  sku: z.string().optional(),
  category_id: z.string().uuid().optional(),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']),
  cost_price: z.number().min(0, 'Preço não pode ser negativo'),
  min_stock: z.number().min(0, 'Estoque mínimo não pode ser negativo'),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase } = auth
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const category_id = searchParams.get('category_id') || ''
    const active = searchParams.get('active')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('products')
      .select('*, category:categories(id, name)', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to)

    if (search) query = query.ilike('name', `%${search}%`)
    if (category_id) query = query.eq('category_id', category_id)
    if (active !== null && active !== '') {
      query = query.eq('active', active === 'true')
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      count,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[products:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produtos.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = profile.tenant?.plan ?? 'free'
    const limit = getPersistedTenantPlanSnapshot(plan).max_products

    if (limit !== -1) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite de ${limit} produtos atingido para o plano atual.` },
          { status: 429 }
        )
      }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ ...parsed.data, tenant_id: profile.tenant_id })
      .select('*, category:categories(id, name)')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um produto com este SKU.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[products:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar produto.' },
      { status: 500 }
    )
  }
}
