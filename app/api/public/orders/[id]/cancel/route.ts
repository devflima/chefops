import { createAdminClient } from '@/lib/supabase/admin'
import { refundOrderIfNeeded } from '@/lib/order-refunds'
import { sendOrderWhatsappNotification } from '@/lib/order-whatsapp'
import { NextRequest, NextResponse } from 'next/server'

type CancelOrderDeps = {
  createAdminClient: typeof createAdminClient
  refundOrderIfNeeded: typeof refundOrderIfNeeded
  sendOrderWhatsappNotification: typeof sendOrderWhatsappNotification
}

export async function cancelPublicOrder(
  request: Pick<NextRequest, 'json'>,
  orderId: string,
  deps: CancelOrderDeps
) {
  try {
    const admin = deps.createAdminClient()
    const body = await request.json().catch(() => ({}))
    const cancelledReason =
      typeof body?.cancelled_reason === 'string' && body.cancelled_reason.trim()
        ? body.cancelled_reason.trim()
        : 'Cancelado pelo cliente'

    const { data: order, error } = await admin
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Este pedido não pode mais ser cancelado pelo cliente.' },
        { status: 422 }
      )
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_reason: cancelledReason,
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    await deps.refundOrderIfNeeded(orderId)

    await deps.sendOrderWhatsappNotification({
      orderId: orderId,
      eventKey: 'order_cancelled',
    }).catch((error) => {
      console.error('[order-whatsapp:public-cancel]', error)
    })

    const { data: updatedOrder, error: updatedOrderError } = await admin
      .from('orders')
      .select('id, order_number, status, payment_status, refunded_at, created_at, updated_at')
      .eq('id', orderId)
      .single()

    if (updatedOrderError || !updatedOrder) {
      throw updatedOrderError ?? new Error('Pedido cancelado, mas não foi possível recarregar os dados.')
    }

    return NextResponse.json({ data: updatedOrder })
  } catch (error) {
    console.error('[public-orders:cancel]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cancelar pedido.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return cancelPublicOrder(request, id, {
    createAdminClient,
    refundOrderIfNeeded,
    sendOrderWhatsappNotification,
  })
}
