import { requireTenantRoles } from '@/lib/auth-guards'
import { defaultDeliverySettings, normalizeDeliverySettings } from '@/lib/delivery-settings'
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
  pricing_mode: z.enum(['flat', 'distance']),
  max_radius_km: z.number().min(0).max(100).nullable(),
  fee_per_km: z.number().min(0).max(999).nullable(),
  origin_zip_code: z.string().nullable(),
  origin_street: z.string().nullable(),
  origin_number: z.string().nullable(),
  origin_neighborhood: z.string().nullable(),
  origin_city: z.string().nullable(),
  origin_state: z.string().length(2).nullable(),
})

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return String(error ?? '')
}

function isMissingColumnError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('schema cache') ||
    message.includes('could not find the')
  )
}

function getLegacyOperationalPayload(payload: z.infer<typeof updateSchema>) {
  return {
    delivery_enabled: payload.delivery_enabled,
    flat_fee: payload.flat_fee,
    accepting_orders: payload.accepting_orders,
    schedule_enabled: payload.schedule_enabled,
    opens_at: payload.opens_at,
    closes_at: payload.closes_at,
  }
}

function getLegacyCorePayload(payload: z.infer<typeof updateSchema>) {
  return {
    delivery_enabled: payload.delivery_enabled,
    flat_fee: payload.flat_fee,
  }
}

async function createDeliverySettings(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
  const attempts = [
    { tenant_id: tenantId, ...defaultDeliverySettings },
    {
      tenant_id: tenantId,
      delivery_enabled: defaultDeliverySettings.delivery_enabled,
      flat_fee: defaultDeliverySettings.flat_fee,
      accepting_orders: defaultDeliverySettings.accepting_orders,
      schedule_enabled: defaultDeliverySettings.schedule_enabled,
      opens_at: defaultDeliverySettings.opens_at,
      closes_at: defaultDeliverySettings.closes_at,
    },
    {
      tenant_id: tenantId,
      delivery_enabled: defaultDeliverySettings.delivery_enabled,
      flat_fee: defaultDeliverySettings.flat_fee,
    },
  ]
  let lastError: unknown = null

  for (const values of attempts) {
    const { data, error } = await admin
      .from('tenant_delivery_settings')
      .insert(values)
      .select()
      .single()

    if (!error && data) {
      return normalizeDeliverySettings({ ...defaultDeliverySettings, ...data, tenant_id: tenantId })
    }

    lastError = error
    if (!isMissingColumnError(error)) {
      throw error
    }
  }

  throw lastError ?? new Error('Não foi possível criar a configuração de entrega.')
}

async function ensureDeliverySettings(
  tenantId: string,
  admin: ReturnType<typeof createAdminClient> = createAdminClient(),
) {
  const { data: existing, error } = await admin
    .from('tenant_delivery_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error

  if (existing) return normalizeDeliverySettings(existing)

  return createDeliverySettings(admin, tenantId)
}

async function getTenantAddressFallback(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
) {
  try {
    const { data, error } = await admin
      .from('tenants')
      .select('zip_code, street, number, neighborhood, city, state')
      .eq('id', tenantId)
      .maybeSingle()

    if (error) {
      if (isMissingColumnError(error)) return null
      throw error
    }

    if (!data) return null

    return {
      origin_zip_code: data.zip_code ?? null,
      origin_street: data.street ?? null,
      origin_number: data.number ?? null,
      origin_neighborhood: data.neighborhood ?? null,
      origin_city: data.city ?? null,
      origin_state: data.state ?? null,
    }
  } catch (error) {
    if (isMissingColumnError(error)) return null
    throw error
  }
}

async function getDeliverySettingsWithTenantFallback(tenantId: string) {
  const admin = createAdminClient()
  const settings = (await ensureDeliverySettings(tenantId, admin)) ?? {
    ...defaultDeliverySettings,
    tenant_id: tenantId,
  }
  const tenantAddress = await getTenantAddressFallback(admin, tenantId)

  if (!tenantAddress) return settings

  return normalizeDeliverySettings({
    ...settings,
    origin_zip_code: settings.origin_zip_code ?? tenantAddress.origin_zip_code,
    origin_street: settings.origin_street ?? tenantAddress.origin_street,
    origin_number: settings.origin_number ?? tenantAddress.origin_number,
    origin_neighborhood: settings.origin_neighborhood ?? tenantAddress.origin_neighborhood,
    origin_city: settings.origin_city ?? tenantAddress.origin_city,
    origin_state: settings.origin_state ?? tenantAddress.origin_state,
  })
}

async function updateDeliverySettings(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  payload: z.infer<typeof updateSchema>,
) {
  const attempts = [payload, getLegacyOperationalPayload(payload), getLegacyCorePayload(payload)]
  let lastError: unknown = null

  for (const values of attempts) {
    const { data, error } = await admin
      .from('tenant_delivery_settings')
      .update(values)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (!error && data) {
      return normalizeDeliverySettings({ ...payload, ...data, tenant_id: tenantId })
    }

    lastError = error
    if (!isMissingColumnError(error)) {
      throw error
    }
  }

  throw lastError ?? new Error('Não foi possível atualizar configuração de entrega.')
}

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response

    const settings = await getDeliverySettingsWithTenantFallback(auth.profile.tenant_id)
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
    const data = await updateDeliverySettings(admin, auth.profile.tenant_id, parsed.data)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[delivery-settings:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração de entrega.' },
      { status: 500 }
    )
  }
}
