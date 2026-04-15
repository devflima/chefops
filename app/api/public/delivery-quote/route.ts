import { isTenantAcceptingOrders } from '@/lib/delivery-operations'
import { normalizeDeliverySettings } from '@/lib/delivery-settings'
import { resolveDeliveryQuote } from '@/lib/delivery-pricing'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  tenant_id: z.string().uuid(),
  delivery_address: z.object({
    zip_code: z.string().min(8),
    street: z.string().min(1),
    number: z.string().min(1),
    neighborhood: z.string().optional().nullable(),
    city: z.string().min(1),
    state: z.string().min(2),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: deliverySettings, error } = await admin
      .from('tenant_delivery_settings')
      .select('delivery_enabled, flat_fee, accepting_orders, schedule_enabled, opens_at, closes_at, pricing_mode, max_radius_km, fee_per_km, origin_zip_code, origin_street, origin_number, origin_neighborhood, origin_city, origin_state')
      .eq('tenant_id', parsed.data.tenant_id)
      .maybeSingle()

    if (error) throw error

    const normalizedDeliverySettings = normalizeDeliverySettings(deliverySettings)

    if (!normalizedDeliverySettings) {
      return NextResponse.json({ error: 'Configuração de entrega não encontrada.' }, { status: 404 })
    }

    if (!isTenantAcceptingOrders(normalizedDeliverySettings)) {
      return NextResponse.json(
        { error: 'O estabelecimento está fechado para novos pedidos no momento.' },
        { status: 409 },
      )
    }

    const quote = await resolveDeliveryQuote(normalizedDeliverySettings, parsed.data.delivery_address)

    if (!quote.ok) {
      return NextResponse.json({ error: quote.error }, { status: 422 })
    }

    return NextResponse.json({
      data: {
        delivery_fee: quote.deliveryFee,
        distance_km: quote.distanceKm,
        pricing_mode: quote.pricingMode,
      },
    })
  } catch (error) {
    console.error('[public-delivery-quote:post]', error)
    return NextResponse.json({ error: 'Erro ao calcular taxa de entrega.' }, { status: 500 })
  }
}
