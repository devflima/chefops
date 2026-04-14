import Link from 'next/link'
import type { SubmitHandler, UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

type ResetPasswordFormValues = {
  password: string
  confirm_password: string
}

type Props = {
  form: UseFormReturn<ResetPasswordFormValues>
  error: string | null
  success: string | null
  onSubmit: SubmitHandler<ResetPasswordFormValues>
}

export function ResetPasswordPageContent({ form, error, success, onSubmit }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
        <CardDescription>Atualize sua senha para voltar ao painel com segurança</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Atualizando senha...' : 'Atualizar senha'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Já conseguiu entrar?{' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Voltar para login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
