import { requireTenantRoles } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  display_order: z.number().int().default(0),
  goes_to_kitchen: z.boolean().default(true),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[categories:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar categorias.' },
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
    const parsed = categorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = profile.tenant?.plan ?? 'free'
    if (plan === 'free') {
      const { count } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      if ((count ?? 0) >= 10) {
        return NextResponse.json(
          { error: 'Limite de 10 categorias atingido para o plano Free.' },
          { status: 429 }
        )
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ ...parsed.data, tenant_id: profile.tenant_id })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[categories:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar categoria.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const body = await request.json()

    const { id, ...rest } = body
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('categories')
      .update(rest)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[categories:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[categories:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao excluir categoria.' },
      { status: 500 }
    )
  }
}
