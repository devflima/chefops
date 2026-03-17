'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'

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
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    form.setValue('tenant_slug', slug, { shouldValidate: true })
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
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cadastre seu estabelecimento no ChefOps</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="tenant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do estabelecimento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Pizzaria do João"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        handleTenantNameChange(e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tenant_slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificador único</FormLabel>
                  <FormControl>
                    <Input placeholder="pizzaria-do-joao" {...field} />
                  </FormControl>
                  <FormDescription>
                    Usado na URL do seu cardápio digital
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Seus dados de acesso
              </p>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seu nome</FormLabel>
                      <FormControl>
                        <Input placeholder="João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-slate-900 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
