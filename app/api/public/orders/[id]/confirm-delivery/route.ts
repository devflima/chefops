import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderWhatsappNotification } from '@/lib/order-whatsapp'
import { NextResponse } from 'next/server'

type ConfirmDeps = {
  createAdminClient: typeof createAdminClient
  sendOrderWhatsappNotification: typeof sendOrderWhatsappNotification
}

const defaultDeps: ConfirmDeps = {
  createAdminClient,
  sendOrderWhatsappNotification,
}

export async function confirmPublicOrderDelivery(
  orderId: string,
  deps: ConfirmDeps = defaultDeps,
) {
  const admin = deps.createAdminClient()

  const { data: existingOrder, error: existingOrderError } = await admin
    .from('orders')
    .select('id, status, payment_method, delivery_status')
    .eq('id', orderId)
    .single()

  if (existingOrderError || !existingOrder) {
    return NextResponse.json(
      { error: 'Pedido não encontrado.' },
      { status: 404 }
    )
  }

  const canConfirmDelivery =
    existingOrder.payment_method === 'delivery' &&
    existingOrder.delivery_status === 'out_for_delivery'

  if (!canConfirmDelivery) {
    return NextResponse.json(
      { error: 'Este pedido ainda não pode ser confirmado como entregue.' },
      { status: 422 }
    )
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({
      status: 'delivered',
      delivery_status: 'delivered',
    })
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  const { data: updatedOrder, error: updatedOrderError } = await admin
    .from('orders')
    .select('id, order_number, status, payment_status, payment_method, delivery_status, cancelled_reason, refunded_at, created_at, updated_at, delivery_driver:delivery_drivers(name)')
    .eq('id', orderId)
    .single()

  if (updatedOrderError || !updatedOrder) {
    return NextResponse.json(
      { error: 'Erro ao recarregar o pedido atualizado.' },
      { status: 500 }
    )
  }

  await deps.sendOrderWhatsappNotification({
    orderId,
    eventKey: 'order_delivered',
  }).catch((error) => {
    console.error('[public-orders:confirm-delivery:whatsapp]', error)
  })

  return NextResponse.json({ data: updatedOrder })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return await confirmPublicOrderDelivery(id)
  } catch (error) {
    console.error('[public-orders:confirm-delivery]', error)
    return NextResponse.json(
      { error: 'Erro ao confirmar entrega do pedido.' },
      { status: 500 }
    )
  }
}
