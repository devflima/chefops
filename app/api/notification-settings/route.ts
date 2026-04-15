import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantFeature } from '@/lib/auth-guards'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const settingsSchema = z.object({
  whatsapp_order_received: z.boolean(),
  whatsapp_order_confirmed: z.boolean(),
  whatsapp_order_preparing: z.boolean(),
  whatsapp_order_ready: z.boolean(),
  whatsapp_order_out_for_delivery: z.boolean(),
  whatsapp_order_delivered: z.boolean(),
  whatsapp_order_cancelled: z.boolean(),
})

const defaultSettings = {
  whatsapp_order_received: true,
  whatsapp_order_confirmed: true,
  whatsapp_order_preparing: true,
  whatsapp_order_ready: true,
  whatsapp_order_out_for_delivery: true,
  whatsapp_order_delivered: false,
  whatsapp_order_cancelled: true,
}

function normalizeNotificationSettings(data: Record<string, unknown> | null, tenantId: string) {
  return {
    tenant_id: tenantId,
    ...defaultSettings,
    ...(data ?? {}),
  }
}

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

function getLegacyNotificationPayload(payload: z.infer<typeof settingsSchema>) {
  const { whatsapp_order_out_for_delivery: _ignored, ...legacy } = payload
  return legacy
}

async function persistNotificationSettings(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  payload: z.infer<typeof settingsSchema>,
  exists: boolean,
) {
  const attempts = [payload, getLegacyNotificationPayload(payload)]
  let lastError: unknown = null

  for (const values of attempts) {
    const query = exists
      ? admin.from('tenant_notification_settings').update(values).eq('tenant_id', tenantId)
      : admin.from('tenant_notification_settings').insert({ tenant_id: tenantId, ...values })

    const { data, error } = await query.select().single()

    if (!error && data) {
      return normalizeNotificationSettings({ ...payload, ...data }, tenantId)
    }

    lastError = error
    if (!isMissingColumnError(error)) {
      throw error
    }
  }

  throw lastError ?? new Error('Não foi possível salvar configurações de notificação.')
}

export async function GET() {
  try {
    const auth = await requireTenantFeature('whatsapp_notifications', ['owner'])
    if (!auth.ok) return auth.response
    const { profile } = auth
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('tenant_notification_settings')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      data: normalizeNotificationSettings(data, profile.tenant_id),
    })
  } catch (error) {
    console.error('[notification-settings:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações de notificação.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireTenantFeature('whatsapp_notifications', ['owner'])
    if (!auth.ok) return auth.response
    const { profile } = auth
    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: existing, error: existingError } = await admin
      .from('tenant_notification_settings')
      .select('tenant_id')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (existingError) throw existingError

    const data = await persistNotificationSettings(admin, profile.tenant_id, parsed.data, Boolean(existing))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[notification-settings:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações de notificação.' },
      { status: 500 }
    )
  }
}
