import { requireTenantRoles } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateDriverSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').optional(),
  phone: z.string().optional(),
  vehicle_type: z.enum(['moto', 'bike', 'carro', 'outro']).optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params

    const body = await request.json()
    const parsed = updateDriverSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const payload = {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone.trim() || null } : {}),
      ...(parsed.data.vehicle_type !== undefined ? { vehicle_type: parsed.data.vehicle_type } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes.trim() || null } : {}),
    }

    const { data, error } = await supabase
      .from('delivery_drivers')
      .update(payload)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Entregador não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[delivery-drivers:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar entregador.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('delivery_drivers')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select('id')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Entregador não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[delivery-drivers:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao remover entregador.' },
      { status: 500 }
    )
  }
}
