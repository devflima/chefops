import { requireTenantRoles } from '@/lib/auth-guards'
import { getPlanResourceLimit } from '@/lib/tenant-plan'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const extraSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  price: z.coerce.number().min(0),
  category: z.enum(['border', 'flavor', 'other']),
  active: z.boolean().default(true),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth

    const { data, error } = await supabase
      .from('extras')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('active', true)
      .order('category')
      .order('name')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[extras:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar adicionais.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const body = await request.json()
    const parsed = extraSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = profile.tenant?.plan ?? 'free'
    const limit = getPlanResourceLimit(plan, 'extras')
    if (limit !== -1) {
      const { count } = await supabase
        .from('extras')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('active', true)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite de ${limit} adicionais atingido para o plano atual.` },
          { status: 429 }
        )
      }
    }

    const { data, error } = await supabase
      .from('extras')
      .insert({ ...parsed.data, tenant_id: profile.tenant_id })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[extras:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar adicional.' },
      { status: 500 }
    )
  }
}
