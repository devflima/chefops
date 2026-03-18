import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('menu_item_extras')
      .select('extra:extras(*)')
      .eq('menu_item_id', id)

    if (error) throw error

    return NextResponse.json({
      data: data.map((d) => d.extra),
    })
  } catch (error) {
    console.error('[menu-item-extras:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar adicionais.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const { extra_ids } = await request.json()

    // Remove todos e reinserere
    await supabase
      .from('menu_item_extras')
      .delete()
      .eq('menu_item_id', id)

    if (extra_ids?.length > 0) {
      const rows = extra_ids.map((extra_id: string) => ({
        menu_item_id: id,
        extra_id,
      }))

      const { error } = await supabase
        .from('menu_item_extras')
        .insert(rows)

      if (error) throw error
    }

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[menu-item-extras:put]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar adicionais.' },
      { status: 500 }
    )
  }
}