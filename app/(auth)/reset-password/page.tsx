'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/client'
import { ResetPasswordPageContent } from '@/features/auth/components/ResetPasswordPageContent'

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    confirm_password: z.string().min(6, 'Confirme sua nova senha'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'As senhas precisam ser iguais',
    path: ['confirm_password'],
  })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  async function onSubmit(values: ResetPasswordForm) {
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: values.password })

    if (updateError) {
      setError('Não foi possível atualizar sua senha.')
      return
    }

    setSuccess('Senha atualizada com sucesso. Redirecionando para o login...')
    router.push('/login?reset=true')
  }

  return (
    <ResetPasswordPageContent
      form={form}
      error={error}
      success={success}
      onSubmit={onSubmit}
    />
  )
}
