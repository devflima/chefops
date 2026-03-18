import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const openSchema = z.object({
  table_id: z.string().uuid(),
  customer_count: z.number().int().min(1).default(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const parsed = openSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

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

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado.' },
        { status: 404 }
      )
    }

    // Verifica se já existe sessão aberta nessa mesa
    const { data: existing } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('table_id', parsed.data.table_id)
      .eq('status', 'open')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Mesa já possui uma comanda aberta.' },
        { status: 409 }
      )
    }

    // Abre sessão e atualiza status da mesa
    const { data: session, error: sessionError } = await supabase
      .from('table_sessions')
      .insert({
        tenant_id: profile.tenant_id,
        table_id: parsed.data.table_id,
        customer_count: parsed.data.customer_count,
        opened_by: user.id,
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    await supabase
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', parsed.data.table_id)

    return NextResponse.json({ data: session }, { status: 201 })
  } catch (error) {
    console.error('[sessions:post]', error)
    return NextResponse.json(
      { error: 'Erro ao abrir comanda.' },
      { status: 500 }
    )
  }
}
