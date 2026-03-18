'use client'

import { useState } from 'react'
import { useMenuItems, useCreateMenuItem } from '@/features/orders/hooks/useOrders'
import { useCategories } from '@/features/products/hooks/useProducts'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, UtensilsCrossed, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { MenuItem } from '@/features/orders/types'
import type { Resolver } from 'react-hook-form'

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
  const [showInactive, setShowInactive] = useState(false)

  const { data: allItems, isLoading } = useMenuItems()
  const { data: categories } = useCategories()
  const createMenuItem = useCreateMenuItem()
  const queryClient = useQueryClient()

  const items = showInactive
    ? allItems
    : allItems?.filter((i: MenuItem) => i.available)

  const inactiveCount = allItems?.filter((i: MenuItem) => !i.available).length ?? 0

  const form = useForm<MenuItemForm, unknown, MenuItemForm>({
    resolver: zodResolver(menuItemSchema) as Resolver<MenuItemForm>,
    defaultValues: { name: '', description: '', price: 0, display_order: 0 },
  })

  const { data: allExtras } = useQuery({
    queryKey: ['extras'],
    queryFn: async () => {
      const res = await fetch('/api/extras')
      const json = await res.json()
      return json.data as { id: string; name: string; price: number; category: string }[]
    },
  })

  const [selectedExtras, setSelectedExtras] = useState<string[]>([])

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', price: 0, display_order: 0 })
    setOpen(true)
  }

  async function openEdit(item: MenuItem) {
    setEditing(item)
    form.reset({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      category_id: item.category_id ?? '',
      display_order: item.display_order,
    })

    const res = await fetch(`/api/menu-items/${item.id}/extras`)
    const json = await res.json()
    setSelectedExtras(json.data?.map((e: { id: string }) => e.id) ?? [])
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
            // Salva extras vinculados
      if (editing) {
        await fetch(`/api/menu-items/${editing.id}/extras`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extra_ids: selectedExtras }),
        })
      }
      setOpen(false)
      form.reset()
    } catch (e: unknown) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao salvar item.',
      })
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    const action = item.available ? 'desativar' : 'reativar'
    if (!confirm(`Deseja ${action} "${item.name}"?`)) return
    setDeletingId(item.id)
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      })
      if (!res.ok) throw new Error()
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    } catch {
      alert(`Erro ao ${action} item.`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cardápio</h1>
          <p className="text-slate-500 text-sm mt-1">
            {allItems?.filter((i: MenuItem) => i.available).length ?? 0} itens disponíveis
            {inactiveCount > 0 && ` · ${inactiveCount} inativo${inactiveCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Ocultar inativos' : `Ver inativos (${inactiveCount})`}
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Novo item
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : items?.length === 0 ? (
          <div className="p-12 text-center">
            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {showInactive ? 'Nenhum item inativo.' : 'Nenhum item no cardápio.'}
            </p>
            {!showInactive && (
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                Adicionar primeiro item
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Item', 'Categoria', 'Preço', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items?.map((item: MenuItem) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50 transition-colors ${!item.available ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    R$ {Number(item.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.available ? 'default' : 'secondary'}>
                      {item.available ? 'Disponível' : 'Indisponível'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {item.available ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleToggleAvailable(item)}
                            disabled={deletingId === item.id}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleToggleAvailable(item)}
                          disabled={deletingId === item.id}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Reativar
                        </Button>
                      )}
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
            <DialogTitle>{editing ? 'Editar item' : 'Novo item do cardápio'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Pizza Margherita" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl><Input placeholder="Ex: Molho de tomate, mussarela e manjericão" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="display_order" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

              {allExtras && allExtras.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Adicionais disponíveis
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                    {allExtras.map((extra) => (
                      <label key={extra.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(extra.id)}
                          onChange={(e) => {
                            setSelectedExtras((prev) =>
                              e.target.checked
                                ? [...prev, extra.id]
                                : prev.filter((id) => id !== extra.id)
                            )
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700">{extra.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {extra.price > 0 ? `+R$ ${Number(extra.price).toFixed(2)}` : 'Grátis'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
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