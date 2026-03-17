import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    // Apenas owner e manager podem fechar o dia
    if (!['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para fechar o dia.' },
        { status: 403 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Idempotência — verifica se já foi fechado hoje
    const { data: existing } = await supabase
      .from('stock_snapshots')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('snapshot_date', today)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'O estoque já foi fechado hoje.' },
        { status: 409 }
      )
    }

    // Busca saldo atual de todos os produtos ativos
    const { data: balances, error: balanceError } = await supabase
      .from('stock_balance')
      .select('product_id, current_stock')
      .eq('tenant_id', profile.tenant_id)
      .eq('active', true)

    if (balanceError) throw balanceError

    if (!balances || balances.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto ativo encontrado.' },
        { status: 422 }
      )
    }

    // Insere snapshots em lote
    const snapshots = balances.map((b) => ({
      tenant_id: profile.tenant_id,
      product_id: b.product_id,
      quantity: b.current_stock,
      snapshot_date: today,
      closed_by: user.id,
    }))

    const { data, error } = await supabase
      .from('stock_snapshots')
      .insert(snapshots)
      .select()

    if (error) throw error

    return NextResponse.json({
      data: {
        snapshot_date: today,
        total_products: data.length,
      },
    })
  } catch (error) {
    console.error('[close-day:post]', error)
    return NextResponse.json(
      { error: 'Erro ao fechar o dia.' },
      { status: 500 }
    )
  }
}