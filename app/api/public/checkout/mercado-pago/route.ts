import { createAdminClient } from '@/lib/supabase/admin'
import { createCheckoutPreference, getMercadoPagoWebhookUrl } from '@/lib/mercadopago'
import { getTenantMercadoPagoAccessToken } from '@/lib/tenant-mercadopago'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const nullableString = z.string().nullable().optional()

const cartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  name: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().positive(),
  notes: nullableString,
  extras: z.array(z.object({
    name: z.string(),
    price: z.number().min(0),
  })).optional(),
  half_flavor: z.object({
    menu_item_id: z.string(),
    name: z.string(),
  }).optional(),
})

const checkoutSchema = z.object({
  tenant_id: z.string().uuid(),
  tenant_slug: z.string().min(1),
  customer_name: z.string().min(2),
  customer_phone: nullableString,
  customer_cpf: nullableString,
  table_id: z.string().uuid().nullable().optional(),
  table_number: nullableString,
  notes: nullableString,
  delivery_address: z.object({
    zip_code: nullableString,
    street: nullableString,
    number: nullableString,
    complement: nullableString,
    neighborhood: nullableString,
    city: nullableString,
    state: nullableString,
    label: nullableString,
    is_default: z.boolean().nullable().optional(),
  }).nullable().optional(),
  items: z.array(cartItemSchema).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const admin = createAdminClient()
    const tenantAccessToken = await getTenantMercadoPagoAccessToken(payload.tenant_id)

    if (!tenantAccessToken) {
      return NextResponse.json(
        { error: 'Pagamento online indisponível para este estabelecimento no momento.' },
        { status: 409 }
      )
    }

    const amount = payload.items.reduce((sum, item) => {
      const extras = item.extras?.reduce((inner, extra) => inner + extra.price, 0) ?? 0
      return sum + (item.price + extras) * item.quantity
    }, 0)

    const { data: session, error: sessionError } = await admin
      .from('checkout_sessions')
      .insert({
        tenant_id: payload.tenant_id,
        status: 'pending',
        amount,
        payload,
      })
      .select()
      .single()

    if (sessionError || !session) throw sessionError

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${payload.tenant_slug}/menu?checkout_session=${session.id}`
    const tableQuery = payload.table_id ? `&table=${encodeURIComponent(payload.table_id)}` : ''

    const preference = await createCheckoutPreference({
      external_reference: `checkout:${session.id}:tenant:${payload.tenant_id}`,
      accessToken: tenantAccessToken,
      notificationUrl: getMercadoPagoWebhookUrl(),
      backUrls: {
        success: `${returnUrl}&checkout_result=success${tableQuery}`,
        pending: `${returnUrl}&checkout_result=pending${tableQuery}`,
        failure: `${returnUrl}&checkout_result=failure${tableQuery}`,
      },
      payer: {
        name: payload.customer_name,
      },
      metadata: {
        checkout_session_id: session.id,
        tenant_id: payload.tenant_id,
      },
      items: payload.items.map((item) => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
        currency_id: 'BRL',
      })),
    })

    const { error: updateError } = await admin
      .from('checkout_sessions')
      .update({
        mercado_pago_preference_id: preference.id,
        mercado_pago_init_point: preference.init_point,
      })
      .eq('id', session.id)

    if (updateError) throw updateError

    return NextResponse.json({
      data: {
        checkout_session_id: session.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      },
    })
  } catch (error) {
    console.error('[public-checkout:mercado-pago]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar checkout online.' },
      { status: 500 }
    )
  }
}
