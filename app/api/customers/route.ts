import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const customerSchema = z.object({
  tenant_id: z.string().uuid(),
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().optional(),
})

const addressSchema = z.object({
  zip_code: z.string().min(8, 'CEP inválido'),
  street: z.string().min(1, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().min(2, 'Estado obrigatório'),
  label: z.string().default('Casa'),
})

const createCustomerSchema = customerSchema.extend({
  address: addressSchema.optional(),
})

// Busca cliente por telefone e tenant
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const tenant_id = searchParams.get('tenant_id')

    if (!phone || !tenant_id) {
      return NextResponse.json(
        { error: 'phone e tenant_id obrigatórios.' },
        { status: 400 }
      )
    }

    const { data, error } = await admin
      .from('customers')
      .select('*, addresses:customer_addresses(*)')
      .eq('tenant_id', tenant_id)
      .eq('phone', phone.replace(/\D/g, ''))
      .single()

    if (error || !data) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[customers:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cliente.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const parsed = createCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { address, ...customerData } = parsed.data
    const cleanPhone = customerData.phone.replace(/\D/g, '')

    // Upsert — cria ou atualiza
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .upsert(
        { ...customerData, phone: cleanPhone },
        { onConflict: 'tenant_id,phone' }
      )
      .select()
      .single()

    if (customerError) throw customerError

    // Salva endereço se fornecido
    if (address) {
      await admin
        .from('customer_addresses')
        .insert({
          ...address,
          customer_id: customer.id,
          tenant_id: customerData.tenant_id,
          is_default: true,
        })
    }

    const { data: full } = await admin
      .from('customers')
      .select('*, addresses:customer_addresses(*)')
      .eq('id', customer.id)
      .single()

    return NextResponse.json({ data: full }, { status: 201 })
  } catch (error) {
    console.error('[customers:post]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar cliente.' },
      { status: 500 }
    )
  }
}