import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('plan, max_users, max_tables, max_products, features, trial_ends_at, plan_ends_at')
      .eq('id', profile.tenant_id)
      .single()

    if (error || !tenant) throw error

    return NextResponse.json({ data: tenant })
  } catch (error) {
    console.error('[plan:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar plano.' },
      { status: 500 }
    )
  }
}