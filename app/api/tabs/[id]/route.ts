import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const closeSchema = z.object({
  action: z.enum(['close']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const parsed = closeSchema.safeParse(body)

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

    const { data: tab } = await supabase
      .from('tabs')
      .select('*, orders(total)')
      .eq('id', id)
      .single()

    if (!tab) {
      return NextResponse.json(
        { error: 'Comanda não encontrada.' },
        { status: 404 }
      )
    }

    const total =
      tab.orders?.reduce((sum: number, order: { total: number }) => {
        return sum + Number(order.total)
      }, 0) ?? 0

    const { data, error } = await supabase
      .from('tabs')
      .update({
        status: 'closed',
        closed_by: user.id,
        closed_at: new Date().toISOString(),
        total,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[tabs:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao fechar comanda.' },
      { status: 500 }
    )
  }
}
