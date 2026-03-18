import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient()
    const { token } = await params

    const { data: qrcode, error } = await supabase
      .from('table_qrcodes')
      .select('*, table:tables(id, number, tenant_id, tenants(slug))')
      .eq('token', token)
      .single()

    if (error || !qrcode) {
      return NextResponse.json({ error: 'QR Code inválido.' }, { status: 404 })
    }

    return NextResponse.json({ data: qrcode })
  } catch (error) {
    console.error('[qrcode:get]', error)
    return NextResponse.json(
      { error: 'Erro ao validar QR Code.' },
      { status: 500 }
    )
  }
}
