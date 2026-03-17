import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']).optional(),
  cost_price: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Produto não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[products:get-one]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produto.' },
      { status: 500 }
    )
  }
}

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
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('products')
      .update(parsed.data)
      .eq('id', id)
      .select('*, category:categories(id, name)')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Produto não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[products:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar produto.' },
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
      .from('products')
      .update({ active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[products:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao desativar produto.' },
      { status: 500 }
    )
  }
}