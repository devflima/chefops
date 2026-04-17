'use client'

import { useOnboarding, useCompleteStep } from '../hooks/useOnboarding'
import { useQueryClient } from '@tanstack/react-query'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Check, ChefHat, Tag, Package, UtensilsCrossed, LayoutGrid } from 'lucide-react'
import {
  buildCategoryPayload,
  buildMenuItemPayload,
  buildProductPayload,
  buildTableCompletionPayload,
  buildTablePayload,
  getOnboardingActiveStep,
  getOnboardingCompletedCount,
  getOnboardingProgress,
  onboardingSteps,
  shouldRenderOnboardingWizard,
} from '@/features/onboarding/onboarding-wizard'

const steps = onboardingSteps.map((step, index) => ({
  ...step,
  icon: [Tag, Package, UtensilsCrossed, LayoutGrid][index],
}))

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

type CategoryForm = z.infer<typeof categorySchema>
type ProductForm = z.infer<typeof productSchema>
type MenuItemForm = z.infer<typeof menuItemSchema>
type TableForm = z.infer<typeof tableSchema>

export default function OnboardingWizard() {
  const { data: onboarding, isLoading } = useOnboarding()
  const completeStep = useCompleteStep()
  const queryClient = useQueryClient()

  const categoryForm = useForm<CategoryForm, unknown, CategoryForm>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryForm>,
    defaultValues: { name: '' },
  })
  const productForm = useForm<ProductForm, unknown, ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
    defaultValues: { name: '', unit: 'un' },
  })
  const menuItemForm = useForm<MenuItemForm, unknown, MenuItemForm>({
    resolver: zodResolver(menuItemSchema) as Resolver<MenuItemForm>,
    defaultValues: { name: '', price: 0 },
  })
  const tableForm = useForm<TableForm, unknown, TableForm>({
    resolver: zodResolver(tableSchema) as Resolver<TableForm>,
    defaultValues: { number: '' },
  })

  const onboardingState = onboarding ?? null
  if (!shouldRenderOnboardingWizard(onboardingState, isLoading)) return null
  if (!onboardingState) return null

  const completedCount = getOnboardingCompletedCount(onboardingState)
  const progress = getOnboardingProgress(onboardingState)
  const activeStep = getOnboardingActiveStep(onboardingState)

  async function handleCategorySubmit(values: { name: string }) {
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCategoryPayload(values)),
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
        body: JSON.stringify(buildProductPayload(values)),
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
        body: JSON.stringify(buildMenuItemPayload(values)),
      })
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      await completeStep.mutateAsync({ has_menu_item: true })
    } catch { /* empty */ }
  }

  async function handleTableSubmit(values: { number: string }) {
    if (!onboardingState) return
    try {
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTablePayload(values)),
      })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      await completeStep.mutateAsync(buildTableCompletionPayload(onboardingState))
    } catch { /* empty */ }
  }

  async function handleSkipTableSubmit() {
    if (!onboardingState) return
    try {
      await completeStep.mutateAsync(buildTableCompletionPayload(onboardingState))
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
          const done = onboardingState[step.key]
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
                              <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" {...field} value={field.value as number} />
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
                      <div className="space-y-3">
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSkipTableSubmit}
                          disabled={tableForm.formState.isSubmitting}
                        >
                          Não se aplica ao meu estabelecimento
                        </Button>
                      </div>
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
