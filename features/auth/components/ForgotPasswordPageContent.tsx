import Link from 'next/link'
import type { SubmitHandler, UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

type ForgotPasswordFormValues = {
  email: string
}

type Props = {
  form: UseFormReturn<ForgotPasswordFormValues>
  error: string | null
  success: string | null
  onSubmit: SubmitHandler<ForgotPasswordFormValues>
}

export function ForgotPasswordPageContent({ form, error, success, onSubmit }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar acesso</CardTitle>
        <CardDescription>Enviaremos um link para redefinir sua senha</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="voce@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enviando link...' : 'Enviar link de redefinição'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Lembrou a senha?{' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Voltar para login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
