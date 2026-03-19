'use client'

import { useState } from 'react'
import { useStockBalance, useStockMovements, useCreateMovement, useCloseDay } from '@/features/stock/hooks/useStock'
import { useProducts } from '@/features/products/hooks/useProducts'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PaginationControls from '@/components/shared/PaginationControls'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, ArrowDown, ArrowUp, Calendar } from 'lucide-react'
import type { StockBalance } from '@/features/stock/types'
import FeatureGate from '@/features/plans/components/FeatureGate'

const movementSchema = z.object({
  product_id: z.string().uuid('Selecione um produto'),
  type: z.enum(['entry', 'exit', 'loss', 'adjustment']),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().optional(),
})

type MovementForm = z.infer<typeof movementSchema>

const typeLabels: Record<string, { label: string; color: string }> = {
  entry:      { label: 'Entrada',   color: 'bg-green-100 text-green-800' },
  exit:       { label: 'Saída',     color: 'bg-blue-100 text-blue-800' },
  loss:       { label: 'Perda',     color: 'bg-red-100 text-red-800' },
  adjustment: { label: 'Ajuste',    color: 'bg-amber-100 text-amber-800' },
}

export default function EstoquePage() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'balance' | 'movements'>('balance')
  const [balancePage, setBalancePage] = useState(1)
  const [movementsPage, setMovementsPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [balanceStatusFilter, setBalanceStatusFilter] = useState<'all' | 'low' | 'ok'>('all')
  const [movementTypeFilter, setMovementTypeFilter] = useState('all')
  const pageSize = 10

  const { data: balance, isLoading } = useStockBalance({
    only_active: true,
  })
  const { data: movements } = useStockMovements()
  const { data: products } = useProducts({ active: true, page: 1, pageSize: 100 })
  const categories = Array.from(
    new Map(
      (balance ?? [])
        .filter((item: StockBalance) => item.category_name)
        .map((item: StockBalance) => [item.category_name, item.category_name])
    ).values()
  )
  const createMovement = useCreateMovement()
  const closeDay = useCloseDay()

  const lowStock = balance?.filter((b: StockBalance) => b.is_low_stock) ?? []
  const filteredBalance = (balance ?? []).filter((item: StockBalance) => {
    if (categoryFilter !== 'all' && item.category_name !== categoryFilter) return false
    if (balanceStatusFilter === 'low') return item.is_low_stock
    if (balanceStatusFilter === 'ok') return !item.is_low_stock
    return true
  })
  const paginatedBalance = filteredBalance.slice(
    (balancePage - 1) * pageSize,
    balancePage * pageSize
  )
  const allMovements = movements?.data ?? []
  const filteredMovements = allMovements.filter((movement: { type: string }) =>
    movementTypeFilter === 'all' ? true : movement.type === movementTypeFilter
  )
  const paginatedMovements = filteredMovements.slice(
    (movementsPage - 1) * pageSize,
    movementsPage * pageSize
  )

  const form = useForm<MovementForm, unknown, MovementForm>({
    resolver: zodResolver(movementSchema) as Resolver<MovementForm>,
    defaultValues: { type: 'entry', quantity: 0, reason: '' },
  })

  async function onSubmit(values: MovementForm) {
    try {
      await createMovement.mutateAsync(values)
      setOpen(false)
      form.reset()
    } catch (e: unknown) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao registrar movimentação.',
      })
    }
  }

  async function handleCloseDay() {
    if (!confirm('Confirma o fechamento do estoque de hoje?')) return
    try {
      const result = await closeDay.mutateAsync()
      alert(`Fechamento realizado! ${result.total_products} produtos registrados.`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao fechar o dia.')
    }
  }

  return (
    <FeatureGate feature='tables'>
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
            <Button variant="outline" onClick={handleCloseDay} disabled={closeDay.isPending}>
              <Calendar className="w-4 h-4 mr-2" />
              {closeDay.isPending ? 'Fechando...' : 'Fechar dia'}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <ArrowUp className="w-4 h-4 mr-2" /> Lançar movimentação
            </Button>
          </div>
        </div>

        {/* Alertas */}
        {lowStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Itens com estoque baixo</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item: StockBalance) => (
                <span key={item.product_id} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
                  {item.product_name} — {Number(item.current_stock).toFixed(3)} {item.unit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {(['balance', 'movements'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'balance' ? 'Saldo atual' : 'Movimentações'}
            </button>
          ))}
        </div>

        {tab === 'balance' && (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value)
                  setBalancePage(1)
                }}
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
                onChange={(event) => {
                  setBalanceStatusFilter(event.target.value as typeof balanceStatusFilter)
                  setBalancePage(1)
                }}
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
                      {['Produto', 'Categoria', 'Saldo atual', 'Mínimo', 'Status'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBalance.map((item: StockBalance) => (
                      <tr key={item.product_id} className={`hover:bg-slate-50 transition-colors ${item.is_low_stock ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                        <td className="px-4 py-3 text-slate-500">{item.category_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${item.is_low_stock ? 'text-amber-600' : 'text-slate-900'}`}>
                            {Number(item.current_stock).toFixed(3)} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.min_stock} {item.unit}</td>
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
              totalPages={Math.max(1, Math.ceil(filteredBalance.length / pageSize))}
              onPageChange={setBalancePage}
            />
          </>
        )}

        {tab === 'movements' && (
          <>
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={movementTypeFilter}
              onChange={(event) => {
                setMovementTypeFilter(event.target.value)
                setMovementsPage(1)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(typeLabels).map(([value, config]) => (
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
                  {['Data', 'Produto', 'Tipo', 'Quantidade', 'Motivo'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMovements.map((m: { id: string; created_at: string; product: { name: string; unit: string }; type: string; quantity: number; reason: string | null }) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{m.product?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${typeLabels[m.type]?.color}`}>
                        {typeLabels[m.type]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {['entry', 'adjustment'].includes(m.type)
                          ? <ArrowUp className="w-3 h-3 text-green-600" />
                          : <ArrowDown className="w-3 h-3 text-red-500" />}
                        {Number(m.quantity).toFixed(3)} {m.product?.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={movementsPage}
            totalPages={Math.max(1, Math.ceil(filteredMovements.length / pageSize))}
            onPageChange={setMovementsPage}
          />
          </>
        )}

        {/* Dialog movimentação */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lançar movimentação</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="product_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.data?.map((p: { id: string; name: string; unit: string }) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([v, { label }]) => (
                          <SelectItem key={v} value={v}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl><Input type="number" step="0.001" min="0.001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo (opcional)</FormLabel>
                    <FormControl><Input placeholder="Ex: Compra fornecedor X" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Lançar'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  )
}
