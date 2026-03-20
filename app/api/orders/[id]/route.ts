import { requireTenantRoles } from '@/lib/auth-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundOrderIfNeeded } from '@/lib/order-refunds'
import { sendOrderWhatsappNotification } from '@/lib/order-whatsapp'
import { deductOrderStockIfNeeded } from '@/lib/stock-deduction'
import { hasPlanFeature } from '@/features/plans/types'
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
  delivery_driver_id: z.string().uuid().nullable().optional(),
  delivery_status: z
    .enum(['waiting_dispatch', 'assigned', 'out_for_delivery', 'delivered'])
    .nullable()
    .optional(),
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
      .select('*, delivery_driver:delivery_drivers(id, name, phone, vehicle_type, active), items:order_items(*, extras:order_item_extras(*)), notifications:order_notifications(id, channel, event_key, status, recipient, error_message, created_at)')
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
    const { supabase, profile, user } = auth
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
      .select('id, tenant_id, status, payment_status, payment_method, delivery_status, delivery_driver_id, delivery_address')
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
    const shouldDeductStock =
      !!parsed.data.status &&
      ['confirmed', 'preparing', 'ready', 'delivered'].includes(parsed.data.status) &&
      existingOrder.status === 'pending' &&
      hasPlanFeature(profile.tenant?.plan ?? 'free', 'stock_automation')

    const isDeliveryOrder = !!existingOrder.delivery_address || existingOrder.payment_method === 'delivery'
    const nextDeliveryStatus =
      parsed.data.status === 'delivered'
        ? 'delivered'
        : parsed.data.delivery_status !== undefined
          ? parsed.data.delivery_status
          : parsed.data.delivery_driver_id !== undefined
            ? (parsed.data.delivery_driver_id ? 'assigned' : 'waiting_dispatch')
            : undefined

    const updatePayload = {
      ...parsed.data,
      ...(parsed.data.delivery_driver_id !== undefined && !isDeliveryOrder
        ? { delivery_driver_id: null }
        : {}),
      ...(isDeliveryOrder && nextDeliveryStatus !== undefined
        ? { delivery_status: nextDeliveryStatus }
        : {}),
      ...(parsed.data.status === 'cancelled' && !parsed.data.cancelled_reason
        ? { cancelled_reason: 'Cancelado pelo estabelecimento' }
        : {}),
    }

    if (parsed.data.delivery_driver_id) {
      const { data: driver } = await supabase
        .from('delivery_drivers')
        .select('id')
        .eq('id', parsed.data.delivery_driver_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('active', true)
        .maybeSingle()

      if (!driver) {
        return NextResponse.json(
          { error: 'Entregador não encontrado ou inativo.' },
          { status: 422 }
        )
      }
    }

    const { data, error } = await admin
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select('*, delivery_driver:delivery_drivers(id, name, phone, vehicle_type, active)')
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

    if (shouldDeductStock) {
      const deductionResult = await deductOrderStockIfNeeded(id, user.id)
      if (deductionResult.deducted) {
        data.stock_deducted_at = new Date().toISOString()
      }
    }

    const statusChanged = parsed.data.status && parsed.data.status !== existingOrder.status
    const eventKeyByStatus = {
      confirmed: 'order_confirmed',
      preparing: 'order_preparing',
      ready: 'order_ready',
      delivered: 'order_delivered',
      cancelled: 'order_cancelled',
    } as const

    if (statusChanged) {
      const eventKey = eventKeyByStatus[parsed.data.status as keyof typeof eventKeyByStatus]
      if (eventKey) {
        await sendOrderWhatsappNotification({
          orderId: id,
          eventKey,
        }).catch((error) => {
          console.error('[order-whatsapp:status-change]', error)
        })
      }
    }

    if (
      isDeliveryOrder &&
      parsed.data.delivery_status === 'out_for_delivery' &&
      existingOrder.delivery_status !== 'out_for_delivery'
    ) {
      await sendOrderWhatsappNotification({
        orderId: id,
        eventKey: 'order_out_for_delivery',
      }).catch((error) => {
        console.error('[order-whatsapp:out-for-delivery]', error)
      })
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
