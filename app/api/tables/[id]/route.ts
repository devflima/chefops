import { requireTenantFeature } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  number: z.string().min(1).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantFeature('tables', ['owner', 'manager', 'cashier'])
    if (!auth.ok) return auth.response
    const { supabase } = auth
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
      .from('tables')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Mesa não encontrada.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[tables:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar mesa.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantFeature('tables', ['owner', 'manager', 'cashier'])
    if (!auth.ok) return auth.response
    const { supabase } = auth
    const { id } = await params

    // Verifica se tem sessão aberta
    const { data: session } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('table_id', id)
      .eq('status', 'open')
      .single()

    if (session) {
      return NextResponse.json(
        { error: 'Não é possível excluir uma mesa com comanda aberta.' },
        { status: 422 }
      )
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[tables:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao excluir mesa.' },
      { status: 500 }
    )
  }
}
