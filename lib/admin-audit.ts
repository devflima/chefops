import { createAdminClient } from '@/lib/supabase/admin'

export async function recordAdminTenantEvent(params: {
  tenantId: string
  adminUserId?: string | null
  eventType: string
  message: string
  metadata?: Record<string, unknown>
}) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('admin_tenant_events')
    .insert({
      tenant_id: params.tenantId,
      admin_user_id: params.adminUserId ?? null,
      event_type: params.eventType,
      message: params.message,
      metadata: params.metadata ?? {},
    })

  if (error) throw error
}
