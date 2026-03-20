import { createAdminClient } from '@/lib/supabase/admin'
import type { CartItem, CustomerAddress } from '@/features/orders/types'
import { sendOrderWhatsappNotification } from '@/lib/order-whatsapp'

type CheckoutSessionPayload = {
  tenant_id: string
  customer_name: string
  customer_phone?: string
  customer_cpf?: string
  table_id?: string
  table_number?: string
  notes?: string
  delivery_fee?: number
  delivery_address?: CustomerAddress
  items: CartItem[]
}

async function resolveSessionId(
  admin: ReturnType<typeof createAdminClient>,
  tableId: string,
  tenantId: string
) {
  const { data: existing } = await admin
    .from('table_sessions')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'open')
    .single()

  if (existing) return existing.id

  const { data: session } = await admin
    .from('table_sessions')
    .insert({
      tenant_id: tenantId,
      table_id: tableId,
      customer_count: 1,
    })
    .select()
    .single()

  if (session) {
    await admin
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', tableId)
  }

  return session?.id ?? null
}

export async function createOrderFromCheckoutSession(params: {
  checkoutSessionId: string
  payload: CheckoutSessionPayload
  paymentId?: string | null
}) {
  const admin = createAdminClient()
  const { checkoutSessionId, payload, paymentId } = params

  const subtotal = payload.items.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((inner, extra) => inner + extra.price, 0) ?? 0
    return sum + (item.price + extrasTotal) * item.quantity
  }, 0)
  const deliveryFee = Number(payload.delivery_fee ?? 0)

  const tableSessionId = payload.table_id
    ? await resolveSessionId(admin, payload.table_id, payload.tenant_id)
    : null

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      tenant_id: payload.tenant_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone ?? null,
      customer_cpf: payload.customer_cpf ?? null,
      table_number: payload.table_number ?? null,
      payment_method: 'online',
      payment_status: 'paid',
      payment_provider: paymentId ? 'mercado_pago' : null,
      payment_transaction_id: paymentId ?? null,
      notes: payload.notes ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      total: subtotal + deliveryFee,
      delivery_address: payload.delivery_address ?? null,
      table_session_id: tableSessionId,
    })
    .select()
    .single()

  if (orderError || !order) {
    throw orderError ?? new Error('Erro ao criar pedido a partir do checkout.')
  }

  const orderItems = payload.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    notes: item.notes ?? null,
  }))

  const { data: insertedItems, error: itemsError } = await admin
    .from('order_items')
    .insert(orderItems)
    .select()

  if (itemsError) throw itemsError

  const extras = insertedItems.flatMap((insertedItem, idx) =>
    (payload.items[idx].extras ?? []).map((extra) => ({
      order_item_id: insertedItem.id,
      name: extra.name,
      price: extra.price,
    }))
  )

  if (extras.length > 0) {
    const { error: extrasError } = await admin
      .from('order_item_extras')
      .insert(extras)

    if (extrasError) throw extrasError
  }

  const { error: checkoutUpdateError } = await admin
    .from('checkout_sessions')
    .update({
      status: 'converted',
      created_order_id: order.id,
      converted_at: new Date().toISOString(),
    })
    .eq('id', checkoutSessionId)

  if (checkoutUpdateError) throw checkoutUpdateError

  await sendOrderWhatsappNotification({
    orderId: order.id,
    eventKey: 'order_received',
  }).catch((error) => {
    console.error('[order-whatsapp:received]', error)
  })

  return order
}
