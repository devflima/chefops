import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const registerSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  tenant_name: z.string().min(2, 'Nome do estabelecimento muito curto'),
  tenant_slug: z
    .string()
    .min(2)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { full_name, email, password, tenant_name, tenant_slug } = parsed.data
    const admin = createAdminClient()

    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .insert({ name: tenant_name, slug: tenant_slug })
      .select()
      .single()

    if (tenantError) {
      if (tenantError.code === '23505') {
        return NextResponse.json(
          { error: 'Este identificador já está em uso. Escolha outro.' },
          { status: 409 }
        )
      }
      throw tenantError
    }

    const { error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        tenant_id: tenant.id,
        role: 'owner',
      },
    })

    if (authError) {
      await admin.from('tenants').delete().eq('id', tenant.id)
      throw authError
    }

    return NextResponse.json({ data: { tenant_slug } }, { status: 201 })
  } catch (error) {
    console.error('[register]', error)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}