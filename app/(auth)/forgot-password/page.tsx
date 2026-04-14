'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/client'
import { ForgotPasswordPageContent } from '@/features/auth/components/ForgotPasswordPageContent'

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordForm) {
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const redirectTo = typeof window === 'undefined'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      : `${window.location.origin}/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    })

    if (resetError) {
      setError('Não foi possível enviar o link de redefinição.')
      return
    }

    setSuccess('Enviamos um link de redefinição para o seu e-mail.')
  }

  return (
    <ForgotPasswordPageContent
      form={form}
      error={error}
      success={success}
      onSubmit={onSubmit}
    />
  )
}
