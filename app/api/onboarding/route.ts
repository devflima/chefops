import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

    const { data, error } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[onboarding:get]', error)
    return NextResponse.json({ error: 'Erro ao buscar onboarding.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

    // Verifica se todos os passos foram concluídos
    const updates = { ...body }
    const allDone =
      (body.has_category ?? false) &&
      (body.has_product ?? false) &&
      (body.has_menu_item ?? false) &&
      (body.has_table ?? false)

    if (allDone) updates.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('onboarding_steps')
      .update(updates)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[onboarding:patch]', error)
    return NextResponse.json({ error: 'Erro ao atualizar onboarding.' }, { status: 500 })
  }
}