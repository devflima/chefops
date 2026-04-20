import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  category: z.enum(['border', 'flavor', 'other']).optional(),
  category_id: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('extras')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Adicional não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[extras:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar adicional.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('extras')
      .update({ active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[extras:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao remover adicional.' },
      { status: 500 }
    )
  }
}
