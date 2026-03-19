import { requireTenantRoles } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createTabSchema = z.object({
  label: z.string().min(1, 'Identificador da comanda obrigatório'),
  notes: z.string().optional(),
})

async function resolveProfile() {
  const auth = await requireTenantRoles(['owner', 'manager', 'cashier'])
  if (!auth.ok) return auth
  return auth
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveProfile()
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth

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
    const auth = await resolveProfile()
    if (!auth.ok) return auth.response
    const { supabase, user, profile } = auth
    const body = await request.json()
    const parsed = createTabSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
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
