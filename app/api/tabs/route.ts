import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createTabSchema = z.object({
  label: z.string().min(1, 'Identificador da comanda obrigatório'),
  notes: z.string().optional(),
})

async function resolveProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await resolveProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const status = request.nextUrl.searchParams.get('status') ?? 'open'

    const { data, error } = await supabase
      .from('tabs')
      .select('*, orders(id, total, payment_status, status)')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[tabs:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar comandas.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, profile } = await resolveProfile()
    const body = await request.json()
    const parsed = createTabSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const normalizedLabel = parsed.data.label.trim()

    const { data: existing } = await supabase
      .from('tabs')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('label', normalizedLabel)
      .eq('status', 'open')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma comanda aberta com este identificador.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('tabs')
      .insert({
        tenant_id: profile.tenant_id,
        label: normalizedLabel,
        notes: parsed.data.notes?.trim() || null,
        opened_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[tabs:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar comanda.' },
      { status: 500 }
    )
  }
}
