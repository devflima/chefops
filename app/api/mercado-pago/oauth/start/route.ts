import { getCurrentProfile } from '@/lib/auth-guards'
import { getMercadoPagoOAuthAuthorizeUrl } from '@/lib/tenant-mercadopago'
import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

export async function GET() {
  const { user, profile } = await getCurrentProfile()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))
  }

  if (profile?.role !== 'owner') {
    return NextResponse.redirect(
      new URL('/integracoes?mercado_pago=forbidden', process.env.NEXT_PUBLIC_APP_URL)
    )
  }

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
