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
      .from('orders')
      .select('id, order_number, status, payment_status, cancelled_reason, refunded_at, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[public-orders:status]', error)
    return NextResponse.json(
      { error: 'Erro ao consultar status do pedido.' },
      { status: 500 }
    )
  }
}
