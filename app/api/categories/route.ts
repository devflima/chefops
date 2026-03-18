import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  display_order: z.number().int().default(0),
  goes_to_kitchen: z.boolean().default(true),
})

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
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
    const supabase = await createClient()
    const body = await request.json()
    const parsed = categorySchema.safeParse(body)

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
    const supabase = await createClient()
    const body = await request.json()

    const { id, ...rest } = body
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('categories')
      .update(rest)
      .eq('id', id)
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
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)

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
