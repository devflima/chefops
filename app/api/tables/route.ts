import { requireTenantRoles } from '@/lib/auth-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const tableSchema = z.object({
  number: z.string().min(1, 'Número obrigatório'),
  capacity: z.number().int().min(1).default(4),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner', 'manager', 'cashier'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth

    const { data, error } = await supabase
      .from('tables')
      .select(`
        *,
        active_session:table_sessions(
          id, status, customer_count, total, opened_at,
          orders(id, order_number, status, total, items:order_items(*))
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('number', { ascending: true })

    if (error) throw error

    const tables = data.map((t) => ({
      ...t,
      active_session: Array.isArray(t.active_session)
        ? t.active_session.find((s: { status: string }) => s.status === 'open') ?? null
        : null,
    }))

    // Calcula total em tempo real
    const tablesWithTotal = tables.map((t) => {
      const session = t.active_session
      if (session && session.orders) {
        session.total = session.orders.reduce(
          (sum: number, o: { total: number }) => sum + Number(o.total), 0
        )
      }
      return t
    })

    return NextResponse.json({ data: tablesWithTotal })
  } catch (error) {
    console.error('[tables:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar mesas.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner', 'manager', 'cashier'])
    if (!auth.ok) return auth.response
    const { supabase, profile } = auth
    const body = await request.json()
    const parsed = tableSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('max_tables')
      .eq('id', profile.tenant_id)
      .single()

    if ((tenant?.max_tables ?? -1) !== -1) {
      const { count } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      if ((count ?? 0) >= (tenant?.max_tables ?? 0)) {
        return NextResponse.json(
          { error: `Limite de ${tenant?.max_tables} mesas atingido para o plano atual.` },
          { status: 429 }
        )
      }
    }

    // Cria mesa e QR Code juntos
    const { data: table, error: tableError } = await admin
      .from('tables')
      .insert({ ...parsed.data, tenant_id: profile.tenant_id })
      .select()
      .single()

    if (tableError) {
      if (tableError.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma mesa com este número.' },
          { status: 409 }
        )
      }
      throw tableError
    }

    // Gera QR Code automaticamente
    await admin
      .from('table_qrcodes')
      .insert({ tenant_id: profile.tenant_id, table_id: table.id })

    return NextResponse.json({ data: table }, { status: 201 })
  } catch (error) {
    console.error('[tables:post]', error)
    return NextResponse.json({ error: 'Erro ao criar mesa.' }, { status: 500 })
  }
}
