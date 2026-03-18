'use client'

import { useState } from 'react'
import {
  useMenuItems,
  useCreateMenuItem,
} from '@/features/orders/hooks/useOrders'
import { useCategories } from '@/features/products/hooks/useProducts'
import { useQueryClient } from '@tanstack/react-query'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, UtensilsCrossed, Pencil, Trash2 } from 'lucide-react'
import type { MenuItem } from '@/features/orders/types'

const menuItemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço obrigatório'),
  category_id: z.string().optional(),
  display_order: z.coerce.number().int().default(0),
})

type MenuItemForm = z.infer<typeof menuItemSchema>

export default function CardapioPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: items, isLoading } = useMenuItems()
  const { data: categories } = useCategories()
  const createMenuItem = useCreateMenuItem()
  const queryClient = useQueryClient()

  const form = useForm<MenuItemForm, unknown, MenuItemForm>({
    resolver: zodResolver(menuItemSchema) as Resolver<MenuItemForm>,
    defaultValues: { name: '', description: '', price: 0, display_order: 0 },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', price: 0, display_order: 0 })
    setOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    form.reset({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      category_id: item.category_id ?? '',
      display_order: item.display_order,
    })
    setOpen(true)
  }

  async function onSubmit(values: MenuItemForm) {
    try {
      if (editing) {
        const res = await fetch(`/api/menu-items/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      } else {
        await createMenuItem.mutateAsync(values)
      }
      setOpen(false)
      form.reset()
    } catch (e: unknown) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao salvar item.',
      })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja desativar este item do cardápio?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    } catch {
      alert('Erro ao remover item.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cardápio</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items?.length ?? 0} itens cadastrados
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo item
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : items?.length === 0 ? (
          <div className="p-12 text-center">
            <UtensilsCrossed className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Nenhum item no cardápio.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openCreate}
            >
              Adicionar primeiro item
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Item', 'Categoria', 'Preço', 'Status', ''].map((h) => (
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
              {items?.map((item: MenuItem) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    R$ {Number(item.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.available ? 'default' : 'secondary'}>
                      {item.available ? 'Disponível' : 'Indisponível'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
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
              {editing ? 'Editar item' : 'Novo item do cardápio'}
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
                      <Input placeholder="Ex: Pizza Margherita" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Molho de tomate, mussarela e manjericão"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
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
                      <FormLabel>Ordem</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((c: { id: string; name: string }) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
