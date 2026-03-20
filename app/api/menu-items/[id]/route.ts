import { requireTenantRoles } from '@/lib/auth-guards'
import { hasPlanFeature } from '@/features/plans/types'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  category_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  available: z.boolean().optional(),
  display_order: z.number().int().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = profile.tenant?.plan ?? 'free'
    if (parsed.data.product_id && !hasPlanFeature(plan, 'stock_automation')) {
      return NextResponse.json(
        { error: 'Baixa automática está disponível apenas nos planos pagos.' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update(parsed.data)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select('*, category:categories(id, name)')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Item não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[menu-items:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar item.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params

    const { error } = await supabase
      .from('menu_items')
      .update({ available: false })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[menu-items:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao remover item.' },
      { status: 500 }
    )
  }
}
