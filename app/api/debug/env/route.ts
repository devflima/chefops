import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    data: {
      mercado_pago_client_id: Boolean(process.env.MERCADO_PAGO_CLIENT_ID),
      mercado_pago_client_secret: Boolean(process.env.MERCADO_PAGO_CLIENT_SECRET),
      mercado_pago_oauth_redirect_uri: Boolean(process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI),
      payment_account_encryption_key: Boolean(process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY),
      next_public_app_url: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    },
  })
}
