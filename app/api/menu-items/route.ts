import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const menuItemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço não pode ser negativo'),
  category_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  available: z.boolean().default(true),
  display_order: z.number().int().default(0),
})

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menu_items')
      .select('*, category:categories(id, name)')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[menu-items:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar itens do cardápio.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const parsed = menuItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
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
      .from('menu_items')
      .insert({ ...parsed.data, tenant_id: profile.tenant_id })
      .select('*, category:categories(id, name)')
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[menu-items:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar item do cardápio.' },
      { status: 500 }
    )
  }
}
