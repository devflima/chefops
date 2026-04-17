import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

import type { UseFormReturn } from 'react-hook-form'

import {
  getSelectableMenuExtras,
  getMenuDialogTitle,
  groupMenuExtrasByCategory,
  type MenuExtraOption,
  type MenuItemIngredient,
  toggleMenuExtraSelection,
} from '@/features/menu/dashboard-menu-page'
import { isPizzaCategoryId } from '@/features/menu/menu-category-rules'
import type { MenuItem } from '@/features/orders/types'

type MenuItemFormValues = {
  name: string
  description?: string
  price: number
  category_id?: string
  display_order: number
}

type ProductOption = {
  id: string
  name: string
  unit: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: MenuItem | null
  form: UseFormReturn<MenuItemFormValues>
  categories?: Array<{ id: string; name: string }>
  hasStockAutomation: boolean
  linkedProductId: string
  onLinkedProductChange: (value: string) => void
  products?: { data?: ProductOption[] }
  ingredients: MenuItemIngredient[]
  onAddIngredient: () => void
  onUpdateIngredient: (index: number, patch: Partial<MenuItemIngredient>) => void
  onRemoveIngredient: (index: number) => void
  allExtras?: MenuExtraOption[]
  selectedExtras: string[]
  onSelectedExtrasChange: (updater: (prev: string[]) => string[]) => void
  onSubmit: (values: MenuItemFormValues) => void | Promise<void>
}

export function MenuItemDialog({
  open,
  onOpenChange,
  editing,
  form,
  categories,
  hasStockAutomation,
  linkedProductId,
  onLinkedProductChange,
  products,
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
  allExtras,
  selectedExtras,
  onSelectedExtrasChange,
  onSubmit,
}: Props) {
  const watchedCategoryId =
    typeof form.watch === 'function' ? form.watch('category_id') : undefined
  const selectedCategoryId =
    (watchedCategoryId && watchedCategoryId !== '' ? watchedCategoryId : undefined) ??
    (typeof form.getValues === 'function' ? form.getValues('category_id') : undefined) ??
    editing?.category_id ??
    (categories?.length === 1 ? categories[0]?.id : undefined)
  const isPizzaCategory = isPizzaCategoryId(selectedCategoryId, categories)
  const visibleExtras = allExtras ? getSelectableMenuExtras(allExtras, selectedCategoryId, categories) : []
  const hasAutomaticBorderExtras = isPizzaCategory && (allExtras?.some((extra) => extra.category === 'border') ?? false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(840px,calc(100%-1.5rem))] max-w-none overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{getMenuDialogTitle(editing)}</DialogTitle>
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
                <Select
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value ?? 'none'}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {hasStockAutomation ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Produto base para baixa simples
                  </label>
                  <Select value={linkedProductId} onValueChange={onLinkedProductChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar produto base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum produto vinculado</SelectItem>
                      {products?.data?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-slate-400">
                    Se não houver ficha técnica, este produto será usado como baixa automática padrão.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ficha técnica</p>
                      <p className="text-xs text-slate-500">
                        Defina os insumos e quantidades que serão baixados automaticamente.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={onAddIngredient} className="shrink-0">
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Adicionar insumo
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {ingredients.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Nenhum insumo configurado. O sistema usará o produto base, se houver.
                      </p>
                    ) : (
                      ingredients.map((ingredient, index) => (
                        <div
                          key={`${ingredient.product_id}-${index}`}
                          className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end"
                        >
                          <Select
                            value={ingredient.product_id}
                            onValueChange={(value) => onUpdateIngredient(index, { product_id: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecionar insumo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecionar insumo</SelectItem>
                              {products?.data?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={ingredient.quantity}
                            onChange={(event) =>
                              onUpdateIngredient(index, { quantity: Number(event.target.value) || 0 })
                            }
                          />
                          <Button type="button" variant="ghost" onClick={() => onRemoveIngredient(index)} className="w-full md:w-auto">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Baixa automática de estoque</p>
                <p className="mt-1 text-sm text-slate-500">
                  Vincular produto base e ficha técnica é um recurso disponível apenas nos planos pagos.
                </p>
              </div>
            )}

            {allExtras && allExtras.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Itens adicionais
                </label>
                {hasAutomaticBorderExtras && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    As bordas são aplicadas automaticamente para itens da categoria Pizza.
                  </div>
                )}
                <div className="max-h-56 space-y-4 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {groupMenuExtrasByCategory(visibleExtras)
                    .flatMap((group) => group.extras)
                    .map((extra) => (
                      <label key={extra.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(extra.id)}
                          onChange={(event) => {
                            onSelectedExtrasChange((prev) =>
                              toggleMenuExtraSelection(prev, extra.id, event.target.checked)
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
