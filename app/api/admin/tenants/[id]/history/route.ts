import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return user
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('admin_tenant_events')
      .select('id, event_type, message, metadata, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error('[admin:tenant-history:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico do tenant.' },
      { status: 500 }
    )
  }
}
