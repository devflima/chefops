import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('extras')
      .select('*')
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
    const supabase = await createClient()
    const body = await request.json()
    const parsed = extraSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

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