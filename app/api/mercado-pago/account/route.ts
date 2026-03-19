import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantRoles } from '@/lib/auth-guards'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response
    const { profile } = auth

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tenant_payment_accounts')
      .select('provider, mercado_pago_user_id, public_key, status, live_mode, token_expires_at, connected_at, updated_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('provider', 'mercado_pago')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[mercado-pago:account:get]', error)
    return NextResponse.json(
      { error: 'Erro ao consultar integração do Mercado Pago.' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response
    const { profile } = auth

    const admin = createAdminClient()
    const { error } = await admin
      .from('tenant_payment_accounts')
      .delete()
      .eq('tenant_id', profile.tenant_id)
      .eq('provider', 'mercado_pago')

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[mercado-pago:account:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao desconectar Mercado Pago.' },
      { status: 500 }
    )
  }
}
