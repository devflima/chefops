import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyCustomerPhoneVerificationCode } from '@/lib/customer-phone-verification'

const schema = z.object({
  tenant_id: z.string().uuid(),
  phone: z.string().min(10, 'Telefone inválido'),
  code: z.string().length(6, 'Código inválido'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await verifyCustomerPhoneVerificationCode({
      tenantId: parsed.data.tenant_id,
      phone: parsed.data.phone,
      code: parsed.data.code,
    })

    if (!result.verified) {
      const errorMessage =
        result.reason === 'too_many_attempts'
          ? 'Muitas tentativas inválidas. Solicite um novo código.'
          : result.reason === 'expired'
            ? 'O código expirou. Solicite um novo.'
            : 'Código inválido.'

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível validar o código.',
      },
      { status: 500 }
    )
  }
}
