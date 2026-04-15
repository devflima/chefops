import { isTenantAcceptingOrders } from '@/lib/delivery-operations'
import { resolveDeliveryQuote } from '@/lib/delivery-pricing'
import { defaultDeliverySettings, normalizeDeliverySettings } from '@/lib/delivery-settings'
import { ensureTenantBillingAccessState } from '@/lib/saas-billing'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const cartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  name: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  extras: z.array(z.object({
    name: z.string(),
    price: z.number().min(0),
  })).optional(),
  half_flavor: z.object({
    menu_item_id: z.string(),
    name: z.string(),
  }).optional(),
})

const createPublicOrderSchema = z.object({
  tenant_id: z.string().uuid(),
  customer_name: z.string().optional(),
  customer_cpf: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  table_number: z.string().optional(),
  table_id: z.string().uuid().optional(),
  tab_id: z.string().uuid().optional(),
  payment_method: z.enum(['online', 'table', 'counter', 'delivery']),
  notes: z.string().optional(),
  delivery_fee: z.number().min(0).optional(),
  delivery_distance_km: z.number().min(0).optional(),
  delivery_address: z.object({
    zip_code: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    complement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    is_default: z.boolean().nullable().optional(),
  }).optional(),
  items: z.array(cartItemSchema).min(1, 'Pedido deve ter ao menos um item'),
})

async function resolveSessionId(
  admin: ReturnType<typeof createAdminClient>,
  tableId: string,
  tenantId: string
): Promise<string | null> {
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

async function resolveTabId(
  admin: ReturnType<typeof createAdminClient>,
  tabId: string,
  tenantId: string
): Promise<string | null> {
  const { data: tab } = await admin
    .from('tabs')
    .select('id, status')
    .eq('id', tabId)
    .eq('tenant_id', tenantId)
    .single()

  if (!tab || tab.status !== 'open') return null

  return tab.id
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const parsed = createPublicOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      tenant_id,
      items,
      delivery_address,
      table_id,
      tab_id,
      ...orderData
    } = parsed.data

    if (table_id && tab_id) {
      return NextResponse.json(
        { error: 'Selecione apenas uma origem: mesa ou comanda.' },
        { status: 400 }
      )
    }

    const { data: tenantData } = await admin
      .from('tenants')
      .select('plan')
      .eq('id', tenant_id)
      .single()
    const billingState = await ensureTenantBillingAccessState(tenant_id)
    const effectivePlan = billingState.downgraded ? 'free' : tenantData?.plan

    const { data: deliverySettings } = await admin
      .from('tenant_delivery_settings')
      .select('delivery_enabled, flat_fee, accepting_orders, schedule_enabled, opens_at, closes_at, pricing_mode, max_radius_km, fee_per_km, origin_zip_code, origin_street, origin_number, origin_neighborhood, origin_city, origin_state')
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    const normalizedDeliverySettings = normalizeDeliverySettings(deliverySettings)

    if (normalizedDeliverySettings && !isTenantAcceptingOrders(normalizedDeliverySettings)) {
      return NextResponse.json(
        { error: 'O estabelecimento está fechado para novos pedidos no momento.' },
        { status: 409 }
      )
    }

    if (effectivePlan === 'free') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .gte('created_at', startOfMonth.toISOString())

      if ((count ?? 0) >= 50) {
        return NextResponse.json(
          { error: 'Limite de 50 pedidos mensais atingido. Faça upgrade do plano.' },
          { status: 429 }
        )
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const extrasTotal = item.extras?.reduce((subtotalSum, extra) => subtotalSum + extra.price, 0) ?? 0
      return sum + (item.price + extrasTotal) * item.quantity
    }, 0)

    let deliveryFee = 0

    if (['online', 'delivery'].includes(parsed.data.payment_method) && delivery_address) {
      const quote = await resolveDeliveryQuote(normalizedDeliverySettings ?? defaultDeliverySettings, delivery_address)
      if (!quote.ok) {
        return NextResponse.json({ error: quote.error }, { status: 422 })
      }
      deliveryFee = quote.deliveryFee
    }
    const initialPaymentStatus = 'pending'

    const tableSessionId = table_id
      ? await resolveSessionId(admin, table_id, tenant_id)
      : null

    const tabId = tab_id
      ? await resolveTabId(admin, tab_id, tenant_id)
      : null

    const isDeliveryOrder = !!delivery_address

    if (table_id && !tableSessionId) {
      return NextResponse.json(
        { error: 'Não foi possível abrir ou localizar a comanda da mesa.' },
        { status: 422 }
      )
    }

    if (tab_id && !tabId) {
      return NextResponse.json(
        { error: 'Comanda não encontrada ou já fechada.' },
        { status: 422 }
      )
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        ...orderData,
        tenant_id,
        payment_status: initialPaymentStatus,
        subtotal,
        delivery_fee: deliveryFee,
        total: subtotal + deliveryFee,
        delivery_status: isDeliveryOrder ? 'waiting_dispatch' : null,
        table_session_id: tableSessionId,
        tab_id: tabId,
        delivery_address: delivery_address ?? null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    const orderItems = items.map((item) => ({
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
      (items[idx].extras ?? []).map((extra) => ({
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

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    console.error('[public-orders:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar pedido.' },
      { status: 500 }
    )
  }
}
