import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Configuração do Supabase ausente no ambiente.' },
        { status: 503 }
      )
    }

    const { email, password } = parsed.data
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[login]', error)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
