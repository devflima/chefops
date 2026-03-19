import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createAdminClient()
    const { id } = await params

    const { data, error } = await admin
      .from('checkout_sessions')
      .select('id, status, created_order_id, created_order:orders(id, order_number, status, payment_status)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Sessão de checkout não encontrada.' },
        { status: 404 }
      )
    }

    const order = Array.isArray(data.created_order)
      ? data.created_order[0]
      : data.created_order

    return NextResponse.json({
      data: {
        id: data.id,
        status: data.status,
        created_order_id: data.created_order_id,
        order_number: order?.order_number ?? null,
        order_status: order?.status ?? null,
        payment_status: order?.payment_status ?? null,
      },
    })
  } catch (error) {
    console.error('[public-checkout:get]', error)
    return NextResponse.json(
      { error: 'Erro ao consultar checkout.' },
      { status: 500 }
    )
  }
}
