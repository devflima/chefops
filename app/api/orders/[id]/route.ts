import { requireTenantRoles } from '@/lib/auth-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundOrderIfNeeded } from '@/lib/order-refunds'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  status: z
    .enum([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'delivered',
      'cancelled',
    ])
    .optional(),
  payment_status: z.enum(['pending', 'paid', 'refunded']).optional(),
  cancelled_reason: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager', 'cashier', 'kitchen'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*, extras:order_item_extras(*))')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[orders:get-one]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pedido.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager', 'cashier', 'kitchen'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const admin = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { data: existingOrder, error: existingOrderError } = await supabase
      .from('orders')
      .select('id, tenant_id, status, payment_status')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (existingOrderError || !existingOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    const shouldRefund =
      parsed.data.status === 'cancelled' &&
      existingOrder.status !== 'cancelled' &&
      existingOrder.payment_status === 'paid'

    const updatePayload = {
      ...parsed.data,
      ...(parsed.data.status === 'cancelled' && !parsed.data.cancelled_reason
        ? { cancelled_reason: 'Cancelado pelo estabelecimento' }
        : {}),
    }

    const { data, error } = await admin
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    if (shouldRefund) {
      await refundOrderIfNeeded(id)
      data.payment_status = 'refunded'
      data.refunded_at = new Date().toISOString()
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[orders:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar pedido.' },
      { status: 500 }
    )
  }
}
