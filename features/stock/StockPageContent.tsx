'use client'

import { AlertTriangle, ArrowDown, ArrowUp, Calendar } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PaginationControls from '@/components/shared/PaginationControls'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StockBalance } from '@/features/stock/types'
import { getStockTotalPages, type BalanceStatusFilter, type StockMovementView, type StockTab } from '@/features/stock/stock-page'

export type StockMovementFormValues = {
  product_id: string
  type: 'entry' | 'exit' | 'loss' | 'adjustment'
  quantity: number
  reason?: string
}

export const stockMovementTypeLabels: Record<string, { label: string; color: string }> = {
  entry: { label: 'Entrada', color: 'bg-green-100 text-green-800' },
  exit: { label: 'Saída', color: 'bg-blue-100 text-blue-800' },
  loss: { label: 'Perda', color: 'bg-red-100 text-red-800' },
  adjustment: { label: 'Ajuste', color: 'bg-amber-100 text-amber-800' },
}

type StockProductOption = { id: string; name: string; unit: string }

type Props = {
  open: boolean
  tab: StockTab
  lowStock: StockBalance[]
  categories: string[]
  categoryFilter: string
  balanceStatusFilter: BalanceStatusFilter
  movementTypeFilter: string
  paginatedBalance: StockBalance[]
  filteredBalanceCount: number
  balancePage: number
  paginatedMovements: StockMovementView[]
  filteredMovementsCount: number
  movementsPage: number
  pageSize: number
  isLoading: boolean
  products?: StockProductOption[]
  closeDayPending: boolean
  form: UseFormReturn<StockMovementFormValues>
  onOpenChange: (open: boolean) => void
  onTabChange: (tab: StockTab) => void
  onCategoryFilterChange: (value: string) => void
  onBalanceStatusFilterChange: (value: BalanceStatusFilter) => void
  onMovementTypeFilterChange: (value: string) => void
  onBalancePageChange: (page: number) => void
  onMovementsPageChange: (page: number) => void
  onCloseDay: () => Promise<void>
  onSubmit: (values: StockMovementFormValues) => Promise<void>
}

export function StockPageContent({
  open,
  tab,
  lowStock,
  categories,
  categoryFilter,
  balanceStatusFilter,
  movementTypeFilter,
  paginatedBalance,
  filteredBalanceCount,
  balancePage,
  paginatedMovements,
  filteredMovementsCount,
  movementsPage,
  pageSize,
  isLoading,
  products,
  closeDayPending,
  form,
  onOpenChange,
  onTabChange,
  onCategoryFilterChange,
  onBalanceStatusFilterChange,
  onMovementTypeFilterChange,
  onBalancePageChange,
  onMovementsPageChange,
  onCloseDay,
  onSubmit,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estoque</h1>
          <p className="text-slate-500 text-sm mt-1">
            {lowStock.length > 0 && (
              <span className="text-amber-600 font-medium">
                ⚠ {lowStock.length} {lowStock.length === 1 ? 'item abaixo' : 'itens abaixo'} do mínimo
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void onCloseDay()} disabled={closeDayPending}>
            <Calendar className="w-4 h-4 mr-2" />
            {closeDayPending ? 'Fechando...' : 'Fechar dia'}
          </Button>
          <Button onClick={() => onOpenChange(true)}>
            <ArrowUp className="w-4 h-4 mr-2" /> Lançar movimentação
          </Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">Itens com estoque baixo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <span key={item.product_id} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
                {item.product_name} — {Number(item.current_stock).toFixed(3)} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {(['balance', 'movements'] as const).map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => onTabChange(currentTab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === currentTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {currentTab === 'balance' ? 'Saldo atual' : 'Movimentações'}
          </button>
        ))}
      </div>

      {tab === 'balance' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryFilterChange(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>

            <select
              value={balanceStatusFilter}
              onChange={(event) => onBalanceStatusFilterChange(event.target.value as BalanceStatusFilter)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Todos os status</option>
              <option value="low">Somente estoque baixo</option>
              <option value="ok">Somente estoque OK</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400">Carregando...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Produto', 'Categoria', 'Saldo atual', 'Mínimo', 'Status'].map((heading) => (
                      <th
                        key={heading}
                        className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBalance.map((item) => (
                    <tr
                      key={item.product_id}
                      className={`hover:bg-slate-50 transition-colors ${item.is_low_stock ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.category_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${item.is_low_stock ? 'text-amber-600' : 'text-slate-900'}`}>
                          {Number(item.current_stock).toFixed(3)} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {item.min_stock} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        {item.is_low_stock ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Baixo</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <PaginationControls
            page={balancePage}
            totalPages={getStockTotalPages(filteredBalanceCount, pageSize)}
            onPageChange={onBalancePageChange}
          />
        </>
      )}

      {tab === 'movements' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={movementTypeFilter}
              onChange={(event) => onMovementTypeFilterChange(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(stockMovementTypeLabels).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Data', 'Produto', 'Tipo', 'Quantidade', 'Motivo'].map((heading) => (
                    <th
                      key={heading}
                      className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(movement.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{movement.product?.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-md font-medium ${stockMovementTypeLabels[movement.type]?.color}`}
                      >
                        {stockMovementTypeLabels[movement.type]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {['entry', 'adjustment'].includes(movement.type) ? (
                          <ArrowUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-red-500" />
                        )}
                        {Number(movement.quantity).toFixed(3)} {movement.product?.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{movement.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={movementsPage}
            totalPages={getStockTotalPages(filteredMovementsCount, pageSize)}
            onPageChange={onMovementsPageChange}
          />
        </>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar movimentação</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar produto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(stockMovementTypeLabels).map(([value, { label }]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" min="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Compra fornecedor X" {...field} />
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
                  {form.formState.isSubmitting ? 'Salvando...' : 'Lançar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
