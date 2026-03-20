import { requireTenantRoles } from '@/lib/auth-guards'
import { createCheckoutPreference } from '@/lib/mercadopago'
import { getTenantMercadoPagoAccessToken, getTenantMercadoPagoAccount } from '@/lib/tenant-mercadopago'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager', 'cashier'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, tenant_id, order_number, customer_name, customer_phone, payment_status, items:order_items(name, quantity, price)')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Este pedido já está pago.' },
        { status: 409 }
      )
    }

    if (!order.items?.length) {
      return NextResponse.json(
        { error: 'Pedido sem itens não pode gerar cobrança.' },
        { status: 422 }
      )
    }

    const tenantAccount = await getTenantMercadoPagoAccount(order.tenant_id)
    const tenantAccessToken = await getTenantMercadoPagoAccessToken(order.tenant_id)

    if (!tenantAccessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago não conectado para este estabelecimento.' },
        { status: 409 }
      )
    }

    const preference = await createCheckoutPreference({
      external_reference: `order:${order.id}:tenant:${order.tenant_id}`,
      accessToken: tenantAccessToken,
      payer: {
        name: order.customer_name ?? undefined,
      },
      metadata: {
        order_id: order.id,
        tenant_id: order.tenant_id,
      },
      items: order.items.map((item: { name: string; quantity: number; price: number }) => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
        currency_id: 'BRL',
      })),
    })

    const checkoutUrl =
      tenantAccount?.live_mode
        ? preference.init_point
        : preference.sandbox_init_point || preference.init_point

    console.info('[orders:mercado-pago:preference-created]', {
      tenantId: order.tenant_id,
      orderId: order.id,
      liveMode: tenantAccount?.live_mode ?? null,
      hasSandboxUrl: Boolean(preference.sandbox_init_point),
    })

    return NextResponse.json({
      data: {
        preference_id: preference.id,
        checkout_url: checkoutUrl,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      },
    })
  } catch (error) {
    console.error('[orders:mercado-pago]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar cobrança no Mercado Pago.' },
      { status: 500 }
    )
  }
}
