import { requireTenantRoles } from '@/lib/auth-guards'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const driverSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().optional(),
  vehicle_type: z.enum(['moto', 'bike', 'carro', 'outro']),
  active: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner', 'manager', 'cashier'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth

    const { data, error } = await supabase
      .from('delivery_drivers')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('active', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[delivery-drivers:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar entregadores.' },
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
    const parsed = driverSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('delivery_drivers')
      .insert({
        tenant_id: profile.tenant_id,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone?.trim() || null,
        vehicle_type: parsed.data.vehicle_type,
        active: parsed.data.active ?? true,
        notes: parsed.data.notes?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[delivery-drivers:post]', error)
    return NextResponse.json(
      { error: 'Erro ao cadastrar entregador.' },
      { status: 500 }
    )
  }
}
