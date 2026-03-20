import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminTenantEvent } from '@/lib/admin-audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  plan: z.enum(['free', 'basic', 'pro']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  suspension_reason: z.string().optional(),
  next_billing_at: z.string().optional(),
})

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: currentTenant, error: currentTenantError } = await admin
      .from('tenants')
      .select('id, name, plan, status, next_billing_at, suspension_reason')
      .eq('id', id)
      .single()

    if (currentTenantError || !currentTenant) throw currentTenantError

    const updates: Record<string, unknown> = { ...parsed.data }

    // Se suspendendo, registra a data
    if (parsed.data.status === 'suspended') {
      updates.suspended_at = new Date().toISOString()
    }

    // Se reativando, limpa suspensão
    if (parsed.data.status === 'active') {
      updates.suspended_at = null
      updates.suspension_reason = null
    }

    const { data, error } = await admin
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const events: Array<Promise<void>> = []

    if (parsed.data.plan && parsed.data.plan !== currentTenant.plan) {
      events.push(
        recordAdminTenantEvent({
          tenantId: id,
          adminUserId: user.id,
          eventType: 'plan_changed',
          message: `Plano alterado de ${currentTenant.plan} para ${parsed.data.plan}.`,
          metadata: {
            from: currentTenant.plan,
            to: parsed.data.plan,
          },
        })
      )
    }

    if (parsed.data.status && parsed.data.status !== currentTenant.status) {
      events.push(
        recordAdminTenantEvent({
          tenantId: id,
          adminUserId: user.id,
          eventType: parsed.data.status === 'suspended' ? 'tenant_suspended' : 'tenant_status_changed',
          message:
            parsed.data.status === 'suspended'
              ? `Estabelecimento suspenso. Motivo: ${parsed.data.suspension_reason ?? 'Não informado'}.`
              : `Status alterado de ${currentTenant.status} para ${parsed.data.status}.`,
          metadata: {
            from: currentTenant.status,
            to: parsed.data.status,
            suspension_reason: parsed.data.suspension_reason ?? null,
          },
        })
      )
    }

    if (
      typeof parsed.data.next_billing_at !== 'undefined' &&
      parsed.data.next_billing_at !== currentTenant.next_billing_at
    ) {
      events.push(
        recordAdminTenantEvent({
          tenantId: id,
          adminUserId: user.id,
          eventType: 'billing_date_changed',
          message: 'Próxima cobrança atualizada no admin.',
          metadata: {
            from: currentTenant.next_billing_at,
            to: parsed.data.next_billing_at,
          },
        })
      )
    }

    if (events.length > 0) {
      await Promise.all(events)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[admin:tenants:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar tenant.' },
      { status: 500 }
    )
  }
}
