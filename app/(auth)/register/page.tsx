'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RegisterPageContent } from '@/features/auth/components/RegisterPageContent'
import { buildTenantSlug, normalizeDigits, normalizeState } from '@/features/auth/register-page'

const registerSchema = z.object({
  tenant_name: z.string().min(2, 'Nome do estabelecimento muito curto'),
  tenant_slug: z
    .string()
    .min(2, 'Slug muito curto')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  cnpj: z.string().transform(normalizeDigits).refine((value) => value.length === 14, 'CNPJ inválido'),
  zip_code: z.string().transform(normalizeDigits).refine((value) => value.length === 8, 'CEP inválido'),
  street: z.string().min(2, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  neighborhood: z.string().optional(),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().transform(normalizeState).refine((value) => value.length === 2, 'Estado obrigatório'),
  full_name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loadingZipCode, setLoadingZipCode] = useState(false)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenant_name: '',
      tenant_slug: '',
      cnpj: '',
      zip_code: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      full_name: '',
      email: '',
      password: '',
    },
  })

  function handleTenantNameChange(value: string) {
    form.setValue('tenant_slug', buildTenantSlug(value), { shouldValidate: true })
  }

  async function handleZipCodeChange(value: string) {
    const clean = normalizeDigits(value)
    if (clean.length !== 8) return

    setLoadingZipCode(true)

    try {
      const res = await fetch(`/api/cep/${clean}`)
      const json = await res.json()

      if (!res.ok || !json.data) return

      form.setValue('street', json.data.street ?? '', { shouldValidate: true })
      form.setValue('neighborhood', json.data.neighborhood ?? '', { shouldValidate: true })
      form.setValue('city', json.data.city ?? '', { shouldValidate: true })
      form.setValue('state', json.data.state ?? '', { shouldValidate: true })
    } finally {
      setLoadingZipCode(false)
    }
  }

  async function onSubmit(values: RegisterForm) {
    setError(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error)
      return
    }

    router.push('/login?registered=true')
  }

  return (
    <RegisterPageContent
      form={form}
      error={error}
      loadingZipCode={loadingZipCode}
      onSubmit={onSubmit}
      onTenantNameChange={handleTenantNameChange}
      onZipCodeChange={handleZipCodeChange}
    />
  )
}
