import { requireTenantRoles } from '@/lib/auth-guards'
import { hasPlanFeature } from '@/features/plans/types'
import { getPlanResourceLimit } from '@/lib/tenant-plan'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const menuItemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço não pode ser negativo'),
  category_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  available: z.boolean().default(true),
  display_order: z.number().int().default(0),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth

    const { data, error } = await supabase
      .from('menu_items')
      .select('*, category:categories(id, name)')
      .eq('tenant_id', profile.tenant_id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[menu-items:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar itens do cardápio.' },
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
    const parsed = menuItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = profile.tenant?.plan ?? 'free'
    const limit = getPlanResourceLimit(plan, 'menu_items')
    if (limit !== -1) {
      const { count } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite de ${limit} itens de cardápio atingido para o plano atual.` },
          { status: 429 }
        )
      }
    }

    if (parsed.data.product_id && !hasPlanFeature(plan, 'stock_automation')) {
      return NextResponse.json(
        { error: 'Baixa automática está disponível apenas nos planos pagos.' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert({ ...parsed.data, tenant_id: profile.tenant_id })
      .select('*, category:categories(id, name)')
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[menu-items:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar item do cardápio.' },
      { status: 500 }
    )
  }
}
