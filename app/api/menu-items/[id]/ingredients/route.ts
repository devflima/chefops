import { requireTenantFeature } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const payloadSchema = z.object({
  ingredients: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.coerce.number().positive(),
    })
  ),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantFeature('stock_automation', ['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('menu_item_ingredients')
      .select('id, product_id, quantity, product:products(id, name, unit)')
      .eq('tenant_id', profile.tenant_id)
      .eq('menu_item_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[menu-item-ingredients:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar ficha técnica.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantFeature('stock_automation', ['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params
    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    await supabase
      .from('menu_item_ingredients')
      .delete()
      .eq('tenant_id', profile.tenant_id)
      .eq('menu_item_id', id)

    if (parsed.data.ingredients.length > 0) {
      const { error } = await supabase
        .from('menu_item_ingredients')
        .insert(
          parsed.data.ingredients.map((ingredient) => ({
            tenant_id: profile.tenant_id,
            menu_item_id: id,
            product_id: ingredient.product_id,
            quantity: ingredient.quantity,
          }))
        )

      if (error) throw error
    }

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[menu-item-ingredients:put]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar ficha técnica.' },
      { status: 500 }
    )
  }
}
