'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RegisterPageContent } from '@/features/auth/components/RegisterPageContent'
import { buildTenantSlug } from '@/features/auth/register-page'

const registerSchema = z.object({
  tenant_name: z.string().min(2, 'Nome do estabelecimento muito curto'),
  tenant_slug: z
    .string()
    .min(2, 'Slug muito curto')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  full_name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenant_name: '',
      tenant_slug: '',
      full_name: '',
      email: '',
      password: '',
    },
  })

  // Gera slug automaticamente a partir do nome do estabelecimento
  function handleTenantNameChange(value: string) {
    form.setValue('tenant_slug', buildTenantSlug(value), { shouldValidate: true })
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
      onSubmit={onSubmit}
      onTenantNameChange={handleTenantNameChange}
    />
  )
}
