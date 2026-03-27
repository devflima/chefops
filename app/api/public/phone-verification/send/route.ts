import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendCustomerPhoneVerificationCode } from '@/lib/customer-phone-verification'

const schema = z.object({
  tenant_id: z.string().uuid(),
  phone: z.string().min(10, 'Telefone inválido'),
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

    const result = await sendCustomerPhoneVerificationCode({
      tenantId: parsed.data.tenant_id,
      phone: parsed.data.phone,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível enviar o código de verificação.',
      },
      { status: 500 }
    )
  }
}
