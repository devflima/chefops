import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantFeature } from '@/lib/auth-guards'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const settingsSchema = z.object({
  whatsapp_order_received: z.boolean(),
  whatsapp_order_confirmed: z.boolean(),
  whatsapp_order_preparing: z.boolean(),
  whatsapp_order_ready: z.boolean(),
  whatsapp_order_delivered: z.boolean(),
  whatsapp_order_cancelled: z.boolean(),
})

const defaultSettings = {
  whatsapp_order_received: true,
  whatsapp_order_confirmed: true,
  whatsapp_order_preparing: true,
  whatsapp_order_ready: true,
  whatsapp_order_delivered: false,
  whatsapp_order_cancelled: true,
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
      data: {
        tenant_id: profile.tenant_id,
        ...defaultSettings,
        ...(data ?? {}),
      },
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

    const { data, error } = await admin
      .from('tenant_notification_settings')
      .upsert({
        tenant_id: profile.tenant_id,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[notification-settings:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações de notificação.' },
      { status: 500 }
    )
  }
}
