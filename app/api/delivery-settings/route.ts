import { requireTenantRoles } from '@/lib/auth-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  delivery_enabled: z.boolean(),
  flat_fee: z.number().min(0).max(999),
  accepting_orders: z.boolean(),
  schedule_enabled: z.boolean(),
  opens_at: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  closes_at: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
})

async function ensureDeliverySettings(tenantId: string) {
  const admin = createAdminClient()

  const { data: existing, error } = await admin
    .from('tenant_delivery_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error

  if (existing) return existing

  const { data: created, error: createError } = await admin
    .from('tenant_delivery_settings')
    .insert({
      tenant_id: tenantId,
      delivery_enabled: false,
      flat_fee: 0,
      accepting_orders: true,
      schedule_enabled: false,
      opens_at: null,
      closes_at: null,
    })
    .select()
    .single()

  if (createError || !created) {
    throw createError ?? new Error('Não foi possível criar a configuração de entrega.')
  }

  return created
}

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response

    const settings = await ensureDeliverySettings(auth.profile.tenant_id)
    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('[delivery-settings:get]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar configuração de entrega.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    await ensureDeliverySettings(auth.profile.tenant_id)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tenant_delivery_settings')
      .update(parsed.data)
      .eq('tenant_id', auth.profile.tenant_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[delivery-settings:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração de entrega.' },
      { status: 500 }
    )
  }
}
