'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PaginationControls from '@/components/shared/PaginationControls'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Settings, Pencil, Trash2 } from 'lucide-react'
import type { Resolver } from 'react-hook-form'
import { useCanAddMore, usePlan } from '@/features/plans/hooks/usePlan'

type Extra = {
  id: string
  name: string
  price: number
  category: 'border' | 'flavor' | 'other'
  active: boolean
}

const extraSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  price: z.coerce.number().min(0),
  category: z.enum(['border', 'flavor', 'other']),
})

type ExtraForm = z.infer<typeof extraSchema>

const categoryLabels = {
  border: 'Borda',
  flavor: 'Sabor',
  other:  'Outro',
}

const categoryColors = {
  border: 'bg-orange-100 text-orange-700',
  flavor: 'bg-purple-100 text-purple-700',
  other:  'bg-slate-100 text-slate-600',
}

export default function ExtrasPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Extra | null>(null)
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'border' | 'flavor' | 'other'>('all')
  const [nameFilter, setNameFilter] = useState('')
  const pageSize = 10
  const queryClient = useQueryClient()
  const { data: plan } = usePlan()

  const { data: extras, isLoading } = useQuery({
    queryKey: ['extras'],
    queryFn: async () => {
      const res = await fetch('/api/extras')
      const json = await res.json()
      return json.data as Extra[]
    },
  })

  const form = useForm<ExtraForm, unknown, ExtraForm>({
    resolver: zodResolver(extraSchema) as Resolver<ExtraForm>,
    defaultValues: { name: '', price: 0, category: 'other' },
  })
  const filteredExtras = (extras ?? []).filter((extra) => {
    if (categoryFilter !== 'all' && extra.category !== categoryFilter) return false
    if (nameFilter && !extra.name.toLowerCase().includes(nameFilter.toLowerCase())) return false
    return true
  })
  const paginatedExtras = filteredExtras.slice((page - 1) * pageSize, page * pageSize)
  const extrasCount = extras?.length ?? 0
  const canAddMoreExtras = useCanAddMore('extras', extrasCount)
  const extrasLimitReached = !!plan && !canAddMoreExtras

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', price: 0, category: 'other' })
    setOpen(true)
  }

  function openEdit(extra: Extra) {
    setEditing(extra)
    form.reset({ name: extra.name, price: extra.price, category: extra.category })
    setOpen(true)
  }

  async function onSubmit(values: ExtraForm) {
    try {
      if (editing) {
        const res = await fetch(`/api/extras/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch('/api/extras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) throw new Error()
      }
      queryClient.invalidateQueries({ queryKey: ['extras'] })
      setOpen(false)
      form.reset()
    } catch {
      form.setError('root', { message: 'Erro ao salvar adicional.' })
    }
  }

  async function handleDelete(extra: Extra) {
    if (!confirm(`Deseja desativar "${extra.name}"?`)) return
    await fetch(`/api/extras/${extra.id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['extras'] })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Adicionais</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bordas, sabores e outros adicionais do cardápio
            {plan?.resource_limits?.extras !== -1
              ? ` · ${extrasCount}/${plan?.resource_limits?.extras} no plano`
              : ''}
          </p>
        </div>
        <Button onClick={openCreate} disabled={extrasLimitReached}>
          <Plus className="w-4 h-4 mr-2" /> Novo adicional
        </Button>
      </div>

      {extrasLimitReached && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O plano atual atingiu o limite de {plan?.resource_limits?.extras} adicionais. Faça upgrade para cadastrar mais.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <Input
            placeholder="Filtrar por nome..."
            value={nameFilter}
            onChange={(event) => {
              setNameFilter(event.target.value)
              setPage(1)
            }}
            className="max-w-sm"
          />
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value as typeof categoryFilter)
              setPage(1)
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Todos os tipos</option>
            <option value="border">Borda</option>
            <option value="flavor">Sabor extra</option>
            <option value="other">Outro</option>
          </select>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : filteredExtras.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum adicional cadastrado.</p>
            <p className="text-slate-400 text-xs mt-1">
              Cadastre bordas recheadas, sabores extras e outros adicionais.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate} disabled={extrasLimitReached}>
              Criar primeiro adicional
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Adicional', 'Tipo', 'Preço', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExtras.map((extra) => (
                <tr key={extra.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{extra.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[extra.category]}`}>
                      {categoryLabels[extra.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {extra.price > 0 ? `+ R$ ${Number(extra.price).toFixed(2)}` : 'Grátis'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(extra)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(extra)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PaginationControls
        page={page}
        totalPages={Math.max(1, Math.ceil(filteredExtras.length / pageSize))}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar adicional' : 'Novo adicional'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Borda de Catupiry, Cheddar, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="border">Borda</SelectItem>
                      <SelectItem value="flavor">Sabor extra</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço adicional (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

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
