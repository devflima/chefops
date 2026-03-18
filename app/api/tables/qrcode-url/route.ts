import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const table_id = searchParams.get('table_id')

    if (!table_id) {
      return NextResponse.json(
        { error: 'table_id obrigatório.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('table_qrcodes')
      .select('token, table:tables(number, tenants(slug))')
      .eq('table_id', table_id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'QR Code não encontrado.' },
        { status: 404 }
      )
    }

    const table = data.table as { number: string; tenants: { slug: string } }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    const url = `${baseUrl}/${table.tenants.slug}/menu?table=${data.token}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[qrcode-url:get]', error)
    return NextResponse.json({ error: 'Erro ao gerar URL.' }, { status: 500 })
  }
}
