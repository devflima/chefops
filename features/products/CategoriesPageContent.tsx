import PaginationControls from '@/components/shared/PaginationControls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { Category } from '@/features/products/types'
import { ChefHat, GlassWater, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

type CategoryForm = {
  name: string
  display_order: number
  goes_to_kitchen: boolean
}

type Props = {
  planUsageText: string
  categoryLimitReached: boolean
  categoryLimit: number | undefined
  openCreate: () => void
  nameFilter: string
  onNameFilterChange: (value: string) => void
  destinationFilter: 'all' | 'kitchen' | 'counter'
  onDestinationFilterChange: (value: 'all' | 'kitchen' | 'counter') => void
  isLoading: boolean
  filteredCategories: Category[]
  paginatedCategories: Category[]
  openEdit: (category: Category) => void
  deletingId: string | null
  onDelete: (category: Category) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Category | null
  form: UseFormReturn<CategoryForm>
  onSubmit: (values: CategoryForm) => void | Promise<void>
}

export function CategoriesPageContent({
  planUsageText,
  categoryLimitReached,
  categoryLimit,
  openCreate,
  nameFilter,
  onNameFilterChange,
  destinationFilter,
  onDestinationFilterChange,
  isLoading,
  filteredCategories,
  paginatedCategories,
  openEdit,
  deletingId,
  onDelete,
  page,
  totalPages,
  onPageChange,
  open,
  onOpenChange,
  editing,
  form,
  onSubmit,
}: Props) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Categorias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Defina quais categorias vão para a cozinha
            {planUsageText}
          </p>
        </div>
        <Button onClick={openCreate} disabled={categoryLimitReached}>
          <Plus className="mr-2 h-4 w-4" /> Nova categoria
        </Button>
      </div>

      {categoryLimitReached && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O plano atual atingiu o limite de {categoryLimit} categorias. Faça upgrade para cadastrar mais.
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
            value={destinationFilter}
            onChange={(event) => onDestinationFilterChange(event.target.value as typeof destinationFilter)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Todos os destinos</option>
            <option value="kitchen">Cozinha</option>
            <option value="counter">Balcão</option>
          </select>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openCreate}
              disabled={categoryLimitReached}
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
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCategories.map((cat) => (
                <tr key={cat.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-500">{cat.display_order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        cat.goes_to_kitchen ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
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
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onDelete(cat)}
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
      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
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
                      <Input placeholder="Ex: Bebidas, Pizzas, Entradas" {...field} />
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
