'use client'

import { useState } from 'react'
import { useOnboarding, useCompleteStep } from '../hooks/useOnboarding'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Check, ChefHat, Tag, Package, UtensilsCrossed, LayoutGrid } from 'lucide-react'

const steps = [
  {
    key: 'has_category' as const,
    title: 'Crie sua primeira categoria',
    description: 'Categorias organizam seu cardápio. Ex: Pizzas, Bebidas, Entradas.',
    icon: Tag,
  },
  {
    key: 'has_product' as const,
    title: 'Cadastre um produto',
    description: 'Produtos são seus insumos para controle de estoque.',
    icon: Package,
  },
  {
    key: 'has_menu_item' as const,
    title: 'Adicione um item ao cardápio',
    description: 'Itens do cardápio são o que seus clientes vão pedir.',
    icon: UtensilsCrossed,
  },
  {
    key: 'has_table' as const,
    title: 'Cadastre uma mesa',
    description: 'Mesas permitem abrir comandas e receber pedidos via QR Code.',
    icon: LayoutGrid,
  },
]

const categorySchema = z.object({ name: z.string().min(1, 'Nome obrigatório') })
const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']),
})
const menuItemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  price: z.coerce.number().min(0.01, 'Preço obrigatório'),
})
const tableSchema = z.object({ number: z.string().min(1, 'Número obrigatório') })

export default function OnboardingWizard() {
  const { data: onboarding, isLoading } = useOnboarding()
  const completeStep = useCompleteStep()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)

  const categoryForm = useForm({ resolver: zodResolver(categorySchema), defaultValues: { name: '' } })
  const productForm = useForm({ resolver: zodResolver(productSchema), defaultValues: { name: '', unit: 'un' as const } })
  const menuItemForm = useForm({ resolver: zodResolver(menuItemSchema), defaultValues: { name: '', price: 0 } })
  const tableForm = useForm({ resolver: zodResolver(tableSchema), defaultValues: { number: '' } })

  if (isLoading || !onboarding || onboarding.completed_at) return null

  const completedCount = steps.filter((s) => onboarding[s.key]).length
  const progress = (completedCount / steps.length) * 100

  // Avança para o primeiro passo incompleto
  const firstIncomplete = steps.findIndex((s) => !onboarding[s.key])
  const activeStep = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

  async function handleCategorySubmit(values: { name: string }) {
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, display_order: 0 }),
      })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      await completeStep.mutateAsync({ has_category: true })
    } catch { /* empty */ }
  }

  async function handleProductSubmit(values: { name: string; unit: string }) {
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, unit: values.unit, cost_price: 0, min_stock: 0 }),
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      await completeStep.mutateAsync({ has_product: true })
    } catch { /* empty */ }
  }

  async function handleMenuItemSubmit(values: { name: string; price: number }) {
    try {
      await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, price: values.price }),
      })
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      await completeStep.mutateAsync({ has_menu_item: true })
    } catch { /* empty */ }
  }

  async function handleTableSubmit(values: { number: string }) {
    try {
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: values.number, capacity: 4 }),
      })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      await completeStep.mutateAsync({
        has_category: onboarding.has_category,
        has_product: onboarding.has_product,
        has_menu_item: onboarding.has_menu_item,
        has_table: true,
      })
    } catch { /* empty */ }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
          <ChefHat className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">Configure o ChefOps</h2>
          <p className="text-xs text-slate-500">{completedCount} de {steps.length} passos concluídos</p>
        </div>
        <span className="text-sm font-medium text-slate-500">{Math.round(progress)}%</span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6">
        <div
          className="bg-slate-900 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Passos */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const done = onboarding[step.key]
          const active = idx === activeStep && !done
          const Icon = step.icon

          return (
            <div
              key={step.key}
              className={`rounded-lg border transition-all ${
                active
                  ? 'border-slate-900 bg-slate-50'
                  : done
                  ? 'border-green-200 bg-green-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  done
                    ? 'bg-green-500'
                    : active
                    ? 'bg-slate-900'
                    : 'bg-slate-100'
                }`}>
                  {done
                    ? <Check className="w-4 h-4 text-white" />
                    : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  }
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-slate-900'}`}>
                    {step.title}
                  </p>
                  {!done && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Formulário inline do passo ativo */}
              {active && (
                <div className="px-4 pb-4 border-t border-slate-200 pt-4">
                  {idx === 0 && (
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="flex gap-2">
                        <FormField control={categoryForm.control} name="name" render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Ex: Pizzas, Bebidas, Entradas" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" disabled={categoryForm.formState.isSubmitting}>
                          {categoryForm.formState.isSubmitting ? 'Criando...' : 'Criar'}
                        </Button>
                      </form>
                    </Form>
                  )}

                  {idx === 1 && (
                    <Form {...productForm}>
                      <form onSubmit={productForm.handleSubmit(handleProductSubmit)} className="flex gap-2">
                        <FormField control={productForm.control} name="name" render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Ex: Farinha de trigo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" disabled={productForm.formState.isSubmitting}>
                          {productForm.formState.isSubmitting ? 'Criando...' : 'Criar'}
                        </Button>
                      </form>
                    </Form>
                  )}

                  {idx === 2 && (
                    <Form {...menuItemForm}>
                      <form onSubmit={menuItemForm.handleSubmit(handleMenuItemSubmit)} className="flex gap-2">
                        <FormField control={menuItemForm.control} name="name" render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Ex: Pizza Margherita" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={menuItemForm.control} name="price" render={({ field }) => (
                          <FormItem className="w-28">
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" disabled={menuItemForm.formState.isSubmitting}>
                          {menuItemForm.formState.isSubmitting ? 'Criando...' : 'Criar'}
                        </Button>
                      </form>
                    </Form>
                  )}

                  {idx === 3 && (
                    <Form {...tableForm}>
                      <form onSubmit={tableForm.handleSubmit(handleTableSubmit)} className="flex gap-2">
                        <FormField control={tableForm.control} name="number" render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Ex: 01, A1, Varanda" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" disabled={tableForm.formState.isSubmitting}>
                          {tableForm.formState.isSubmitting ? 'Criando...' : 'Criar'}
                        </Button>
                      </form>
                    </Form>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}