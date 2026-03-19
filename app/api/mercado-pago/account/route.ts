import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

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
