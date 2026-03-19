import { createClient } from '@/lib/supabase/server'
import { getMercadoPagoOAuthAuthorizeUrl } from '@/lib/tenant-mercadopago'
import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.redirect(
      new URL('/integracoes?mercado_pago=missing_tenant', process.env.NEXT_PUBLIC_APP_URL)
    )
  }

  const state = crypto.randomUUID()
  const response = NextResponse.redirect(getMercadoPagoOAuthAuthorizeUrl(state))

  response.cookies.set(
    'mp_oauth_state',
    JSON.stringify({
      state,
      tenant_id: profile.tenant_id,
    }),
    {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    }
  )

  return response
}
