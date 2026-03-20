import {
  exchangeMercadoPagoAuthorizationCode,
  upsertTenantMercadoPagoAccount,
} from '@/lib/tenant-mercadopago'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const cookieStore = await cookies()
    const rawState = cookieStore.get('mp_oauth_state')?.value

    if (!code || !state || !rawState) {
      return NextResponse.redirect(
        new URL('/integracoes?mercado_pago=invalid_state', process.env.NEXT_PUBLIC_APP_URL)
      )
    }

    const parsed = JSON.parse(rawState) as { state: string; tenant_id: string }

    if (parsed.state !== state || !parsed.tenant_id) {
      return NextResponse.redirect(
        new URL('/integracoes?mercado_pago=invalid_state', process.env.NEXT_PUBLIC_APP_URL)
      )
    }

    const tokens = await exchangeMercadoPagoAuthorizationCode(code)
    await upsertTenantMercadoPagoAccount({
      tenantId: parsed.tenant_id,
      tokens,
    })

    const response = NextResponse.redirect(
      new URL('/integracoes?mercado_pago=connected', process.env.NEXT_PUBLIC_APP_URL)
    )
    response.cookies.delete('mp_oauth_state')
    return response
  } catch (error) {
    console.error('[mercado-pago:oauth-callback]', error)
    return NextResponse.redirect(
      new URL('/integracoes?mercado_pago=error', process.env.NEXT_PUBLIC_APP_URL)
    )
  }
}
