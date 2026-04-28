import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')
    const phone = searchParams.get('phone')

    if (!tenant_id || !phone) {
      return NextResponse.json(
        { error: 'tenant_id e phone obrigatórios.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Valida se o cliente existe
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('phone', phone.replace(/\D/g, ''))
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado ou acesso não autorizado.' },
        { status: 403 }
      )
    }

    // Deleta o endereço
    const { error: deleteError } = await admin
      .from('customer_addresses')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('customer_id', customer.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[addresses:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao excluir endereço.' },
      { status: 500 }
    )
  }
}
