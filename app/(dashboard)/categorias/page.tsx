'use client'

import { useState } from 'react'
import { useCategories } from '@/features/products/hooks/useProducts'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Plus, Tag, ChefHat, GlassWater, Pencil, Trash2 } from 'lucide-react'
import type { Category } from '@/features/products/types'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  display_order: z.number({ coerce: true }).int().default(0),
  goes_to_kitchen: z.boolean().default(true),
})

type CategoryForm = z.infer<typeof categorySchema>

export default function CategoriasPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: categories, isLoading } = useCategories()
  const queryClient = useQueryClient()

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', display_order: 0, goes_to_kitchen: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', display_order: 0, goes_to_kitchen: true })
    setOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset({
      name: cat.name,
      display_order: cat.display_order,
      goes_to_kitchen: cat.goes_to_kitchen,
    })
    setOpen(true)
  }

  async function onSubmit(values: CategoryForm) {
    try {
      if (editing) {
        const res = await fetch('/api/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...values }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      form.reset()
    } catch (e: unknown) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao salvar categoria.',
      })
    }
  }

  async function handleDelete(cat: Category) {
    if (
      !confirm(
        `Deseja excluir a categoria "${cat.name}"?\nProdutos vinculados ficarão sem categoria.`
      )
    )
      return
    setDeletingId(cat.id)
    try {
      const res = await fetch(`/api/categories?id=${cat.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    } catch {
      alert('Erro ao excluir categoria.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Categorias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Defina quais categorias vão para a cozinha
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova categoria
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : categories?.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              Nenhuma categoria cadastrada.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openCreate}
            >
              Criar primeira categoria
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Categoria', 'Ordem', 'Destino', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories?.map((cat: Category) => (
                <tr
                  key={cat.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {cat.display_order}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        cat.goes_to_kitchen
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {cat.goes_to_kitchen ? (
                        <>
                          <ChefHat className="h-3 w-3" /> Cozinha
                        </>
                      ) : (
                        <>
                          <GlassWater className="h-3 w-3" /> Balcão
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Bebidas, Pizzas, Entradas"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de exibição</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goes_to_kitchen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino dos pedidos</FormLabel>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange(true)}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                          field.value
                            ? 'border-orange-300 bg-orange-50 font-medium text-orange-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <ChefHat className="h-4 w-4" /> Cozinha
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(false)}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                          !field.value
                            ? 'border-blue-300 bg-blue-50 font-medium text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <GlassWater className="h-4 w-4" /> Balcão
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.root.message}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
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
