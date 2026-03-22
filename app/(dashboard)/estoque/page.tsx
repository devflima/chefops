'use client'

import { useState } from 'react'
import { useStockBalance, useStockMovements, useCreateMovement, useCloseDay } from '@/features/stock/hooks/useStock'
import { useProducts } from '@/features/products/hooks/useProducts'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FeatureGate from '@/features/plans/components/FeatureGate'
import {
  filterStockBalance,
  filterStockMovements,
  getLowStockItems,
  getStockCategories,
  paginateStockItems,
  type BalanceStatusFilter,
  type StockTab,
} from '@/features/stock/stock-page'
import { StockPageContent, type StockMovementFormValues } from '@/features/stock/StockPageContent'

const movementSchema = z.object({
  product_id: z.string().uuid('Selecione um produto'),
  type: z.enum(['entry', 'exit', 'loss', 'adjustment']),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().optional(),
})

export default function EstoquePage() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<StockTab>('balance')
  const [balancePage, setBalancePage] = useState(1)
  const [movementsPage, setMovementsPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [balanceStatusFilter, setBalanceStatusFilter] = useState<BalanceStatusFilter>('all')
  const [movementTypeFilter, setMovementTypeFilter] = useState('all')
  const pageSize = 10

  const { data: balance, isLoading } = useStockBalance({
    only_active: true,
  })
  const { data: movements } = useStockMovements()
  const { data: products } = useProducts({ active: true, page: 1, pageSize: 100 })
  const categories = getStockCategories(balance ?? [])
  const createMovement = useCreateMovement()
  const closeDay = useCloseDay()

  const lowStock = getLowStockItems(balance ?? [])
  const filteredBalance = filterStockBalance(balance ?? [], categoryFilter, balanceStatusFilter)
  const paginatedBalance = paginateStockItems(filteredBalance, balancePage, pageSize)
  const allMovements = movements?.data ?? []
  const filteredMovements = filterStockMovements(allMovements, movementTypeFilter)
  const paginatedMovements = paginateStockItems(filteredMovements, movementsPage, pageSize)

  const form = useForm<StockMovementFormValues, unknown, StockMovementFormValues>({
    resolver: zodResolver(movementSchema) as Resolver<StockMovementFormValues>,
    defaultValues: { type: 'entry', quantity: 0, reason: '' },
  })

  async function onSubmit(values: StockMovementFormValues) {
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
    <FeatureGate feature='stock'>
      <StockPageContent
        open={open}
        tab={tab}
        lowStock={lowStock}
        categories={categories}
        categoryFilter={categoryFilter}
        balanceStatusFilter={balanceStatusFilter}
        movementTypeFilter={movementTypeFilter}
        paginatedBalance={paginatedBalance}
        filteredBalanceCount={filteredBalance.length}
        balancePage={balancePage}
        paginatedMovements={paginatedMovements}
        filteredMovementsCount={filteredMovements.length}
        movementsPage={movementsPage}
        pageSize={pageSize}
        isLoading={isLoading}
        products={products?.data}
        closeDayPending={closeDay.isPending}
        form={form}
        onOpenChange={setOpen}
        onTabChange={setTab}
        onCategoryFilterChange={(value) => {
          setCategoryFilter(value)
          setBalancePage(1)
        }}
        onBalanceStatusFilterChange={(value) => {
          setBalanceStatusFilter(value)
          setBalancePage(1)
        }}
        onMovementTypeFilterChange={(value) => {
          setMovementTypeFilter(value)
          setMovementsPage(1)
        }}
        onBalancePageChange={setBalancePage}
        onMovementsPageChange={setMovementsPage}
        onCloseDay={handleCloseDay}
        onSubmit={onSubmit}
      />
    </FeatureGate>
  )
}
