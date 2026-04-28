import PaginationControls from '@/components/shared/PaginationControls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import type { Extra, ExtraCategoryFilter } from '@/features/products/extras-page'

type ExtraForm = {
  name: string
  price: number
  category: 'border' | 'flavor' | 'other'
  target_categories: string[]
}

type CategoryOption = {
  id: string
  name: string
}

const categoryLabels = {
  border: 'Borda',
  flavor: 'Extras',
  other: 'Outro',
}

const categoryColors = {
  border: 'bg-orange-100 text-orange-700',
  flavor: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
}

type Props = {
  planUsageText: string
  extrasLimitReached: boolean
  extrasLimit: number | undefined
  openCreate: () => void
  nameFilter: string
  onNameFilterChange: (value: string) => void
  categoryFilter: ExtraCategoryFilter
  onCategoryFilterChange: (value: ExtraCategoryFilter) => void
  isLoading: boolean
  filteredExtras: Extra[]
  paginatedExtras: Extra[]
  openEdit: (extra: Extra) => void
  onDelete: (extra: Extra) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Extra | null
  categories: CategoryOption[]
  form: UseFormReturn<ExtraForm>
  onSubmit: (values: ExtraForm) => void | Promise<void>
}

export function ExtrasPageContent({
  planUsageText,
  extrasLimitReached,
  extrasLimit,
  openCreate,
  nameFilter,
  onNameFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  isLoading,
  filteredExtras,
  paginatedExtras,
  openEdit,
  onDelete,
  page,
  totalPages,
  onPageChange,
  open,
  onOpenChange,
  editing,
  categories,
  form,
  onSubmit,
}: Props) {
  const selectedType = form.watch('category')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Adicionais</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bordas, extras e outros adicionais do cardápio
            {planUsageText}
          </p>
        </div>
        <Button onClick={openCreate} disabled={extrasLimitReached}>
          <Plus className="mr-2 h-4 w-4" /> Novo adicional
        </Button>
      </div>

      {extrasLimitReached && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O plano atual atingiu o limite de {extrasLimit} adicionais. Faça upgrade para cadastrar mais.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <Input
            placeholder="Filtrar por nome..."
            value={nameFilter}
            onChange={(event) => onNameFilterChange(event.target.value)}
            className="max-w-sm"
          />
          <select
            value={categoryFilter}
            onChange={(event) => onCategoryFilterChange(event.target.value as ExtraCategoryFilter)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Todos os tipos</option>
            <option value="border">Borda</option>
            <option value="flavor">Extras</option>
            <option value="other">Outro</option>
          </select>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : filteredExtras.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Nenhum adicional cadastrado.</p>
            <p className="mt-1 text-xs text-slate-400">
              Cadastre bordas recheadas, extras e outros adicionais.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate} disabled={extrasLimitReached}>
              Criar primeiro adicional
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Adicional', 'Tipo', 'Categoria vinculada', 'Preço', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExtras.map((extra) => (
                <tr key={extra.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{extra.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryColors[extra.category]}`}>
                      {categoryLabels[extra.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {extra.target_categories?.length > 0
                      ? extra.target_categories
                          .map((id) => categories.find((c) => c.id === id)?.name)
                          .filter(Boolean)
                          .join(', ')
                      : 'Todas as categorias'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {extra.price > 0 ? `+ R$ ${Number(extra.price).toFixed(2)}` : 'Grátis'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(extra)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onDelete(extra)}
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
      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar adicional' : 'Novo adicional'}</DialogTitle>
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
                      <Input placeholder="Ex: Borda de Catupiry, Cheddar, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="border">Borda</SelectItem>
                        <SelectItem value="flavor">Extras</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorias vinculadas</FormLabel>
                    <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-slate-200 p-3 sm:grid-cols-2">
                      {categories.map((category) => (
                        <label key={category.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            checked={field.value?.includes(category.id) ?? false}
                            onChange={(e) => {
                              const checked = e.target.checked
                              const newValue = checked
                                ? [...(field.value || []), category.id]
                                : (field.value || []).filter((val: string) => val !== category.id)
                              field.onChange(newValue)
                            }}
                          />
                          <span className="text-slate-700">{category.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Marque as categorias onde este adicional deve aparecer. Se não selecionar nenhuma, ele será exibido em todas.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço adicional (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
