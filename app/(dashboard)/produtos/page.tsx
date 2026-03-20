'use client'

import { useState } from 'react'
import { useProducts, useCategories, useCreateProduct, useUpdateProduct } from '@/features/products/hooks/useProducts'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PaginationControls from '@/components/shared/PaginationControls'
import { Plus, Package } from 'lucide-react'
import type { Product } from '@/features/products/types'
import { useCanAddMore, usePlan } from '@/features/plans/hooks/usePlan'

const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  sku: z.string().optional(),
  category_id: z.string().optional(),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']),
  cost_price: z.coerce.number().min(0),
  min_stock: z.coerce.number().min(0),
})

type ProductForm = z.infer<typeof productSchema>

const unitLabels: Record<string, string> = {
  un: 'Unidade', kg: 'Kg', g: 'Grama',
  l: 'Litro', ml: 'mL', cx: 'Caixa', pct: 'Pacote',
}

export default function ProdutosPage() {
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const pageSize = 10

  const { data, isLoading } = useProducts({
    page,
    pageSize,
    category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    active: statusFilter === 'all' ? undefined : statusFilter === 'active',
  })
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const { data: plan } = usePlan()
  const canAddMoreProducts = useCanAddMore('products', data?.count ?? 0)
  const productLimitReached = !!plan && !canAddMoreProducts

  const form = useForm<ProductForm, unknown, ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
    defaultValues: { name: '', sku: '', unit: 'un', cost_price: 0, min_stock: 0 },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', sku: '', unit: 'un', cost_price: 0, min_stock: 0 })
    setOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    form.reset({
      name: product.name,
      sku: product.sku || '',
      category_id: product.category_id || '',
      unit: product.unit,
      cost_price: product.cost_price,
      min_stock: product.min_stock,
    })
    setOpen(true)
  }

  async function onSubmit(values: ProductForm) {
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...values })
      } else {
        await createProduct.mutateAsync(values)
      }
      setOpen(false)
    } catch (e: unknown) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao salvar produto.',
      })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Produtos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {data?.count ?? 0} produtos cadastrados
            {plan && plan.max_products !== -1 ? ` · ${data?.count ?? 0}/${plan.max_products} no plano` : ''}
          </p>
        </div>
        <Button onClick={openCreate} disabled={productLimitReached}>
          <Plus className="w-4 h-4 mr-2" /> Novo produto
        </Button>
      </div>

      {productLimitReached && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O plano atual atingiu o limite de {plan?.max_products} produtos. Faça upgrade para cadastrar mais.
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value)
            setPage(1)
          }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
        >
          <option value="all">Todas as categorias</option>
          {categories?.map((category: { id: string; name: string }) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter)
            setPage(1)
          }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
        >
          <option value="all">Todos os status</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : data?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum produto cadastrado.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate} disabled={productLimitReached}>
              Cadastrar primeiro produto
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Produto', 'Categoria', 'Unidade', 'Preço custo', 'Estoque mín.', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.data?.map((product: Product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{product.name}</p>
                    {product.sku && (
                      <p className="text-xs text-slate-400">SKU: {product.sku}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {product.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {unitLabels[product.unit]}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    R$ {Number(product.cost_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {product.min_stock} {product.unit}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={product.active ? 'default' : 'secondary'}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaginationControls
        page={page}
        totalPages={Math.max(1, Math.ceil((data?.count ?? 0) / pageSize))}
        onPageChange={setPage}
      />

      {/* Dialog cadastro/edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><span /></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Farinha de trigo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (opcional)</FormLabel>
                    <FormControl><Input placeholder="Ex: FT-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(unitLabels).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((c: { id: string; name: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cost_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de custo (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="min_stock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque mínimo</FormLabel>
                    <FormControl><Input type="number" step="0.001" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
