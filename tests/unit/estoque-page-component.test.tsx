import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStockBalanceMock = vi.fn()
const useStockMovementsMock = vi.fn()
const useCreateMovementMock = vi.fn()
const useCloseDayMock = vi.fn()
const useProductsMock = vi.fn()
const formResetMock = vi.fn()
const formSetErrorMock = vi.fn()

let capturedStockPageContentProps: Record<string, unknown> | null = null

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

vi.mock('react-hook-form', () => ({
  useForm: (options?: { defaultValues?: Record<string, unknown> }) => ({
    control: {},
    formState: { isSubmitting: false, errors: {} },
    reset: formResetMock,
    setError: formSetErrorMock,
    handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => () => callback(options?.defaultValues ?? {}),
  }),
}))

vi.mock('@/features/stock/hooks/useStock', () => ({
  useStockBalance: (...args: Parameters<typeof useStockBalanceMock>) => useStockBalanceMock(...args),
  useStockMovements: () => useStockMovementsMock(),
  useCreateMovement: () => useCreateMovementMock(),
  useCloseDay: () => useCloseDayMock(),
}))

vi.mock('@/features/products/hooks/useProducts', () => ({
  useProducts: (...args: Parameters<typeof useProductsMock>) => useProductsMock(...args),
}))

vi.mock('@/features/stock/StockPageContent', () => ({
  StockPageContent: (props: Record<string, unknown>) => {
    capturedStockPageContentProps = props
    return React.createElement('div', null, 'Stock Page Content Mock')
  },
}))

describe('EstoquePage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedStockPageContentProps = null

    useStockBalanceMock.mockReturnValue({
      data: [
        {
          product_id: 'prod-1',
          product_name: 'Molho',
          category_name: 'Insumos',
          current_stock: 2,
          min_stock: 5,
          unit: 'kg',
          is_low_stock: true,
        },
      ],
      isLoading: false,
    })
    useStockMovementsMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'mov-1',
            created_at: '2026-03-22T12:00:00.000Z',
            product: { name: 'Molho', unit: 'kg' },
            type: 'entry',
            quantity: 3,
            reason: 'Compra',
          },
        ],
      },
    })
    useProductsMock.mockReturnValue({
      data: {
        data: [{ id: 'prod-1', name: 'Molho', unit: 'kg' }],
      },
    })
    useCreateMovementMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useCloseDayMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({ total_products: 1 }),
    })

    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais da página', async () => {
    const { default: EstoquePage } = await import('@/app/(dashboard)/estoque/page')

    expect(renderToStaticMarkup(React.createElement(EstoquePage))).toContain('Stock Page Content Mock')
    expect(capturedStockPageContentProps).toBeTruthy()

    const props = capturedStockPageContentProps as {
      lowStock: Array<{ product_id: string }>
      categories: string[]
      categoryFilter: string
      balanceStatusFilter: string
      movementTypeFilter: string
      filteredBalanceCount: number
      filteredMovementsCount: number
      balancePage: number
      movementsPage: number
      pageSize: number
      products: Array<{ id: string; name: string }>
      closeDayPending: boolean
      onOpenChange: (open: boolean) => void
      onTabChange: (tab: 'balance' | 'movements') => void
      onCategoryFilterChange: (value: string) => void
      onBalanceStatusFilterChange: (value: 'all' | 'low' | 'ok') => void
      onMovementTypeFilterChange: (value: string) => void
      onBalancePageChange: (page: number) => void
      onMovementsPageChange: (page: number) => void
      onCloseDay: () => Promise<void>
      onSubmit: (values: {
        product_id: string
        type: 'entry' | 'exit' | 'loss' | 'adjustment'
        quantity: number
        reason?: string
      }) => Promise<void>
    }

    expect(props.lowStock).toHaveLength(1)
    expect(props.categories).toEqual(['Insumos'])
    expect(props.categoryFilter).toBe('all')
    expect(props.balanceStatusFilter).toBe('all')
    expect(props.movementTypeFilter).toBe('all')
    expect(props.filteredBalanceCount).toBe(1)
    expect(props.filteredMovementsCount).toBe(1)
    expect(props.balancePage).toBe(1)
    expect(props.movementsPage).toBe(1)
    expect(props.pageSize).toBe(10)
    expect(props.products).toEqual([{ id: 'prod-1', name: 'Molho', unit: 'kg' }])
    expect(props.closeDayPending).toBe(false)

    props.onOpenChange(true)
    props.onTabChange('movements')
    props.onCategoryFilterChange('Insumos')
    props.onBalanceStatusFilterChange('low')
    props.onMovementTypeFilterChange('entry')
    props.onBalancePageChange(2)
    props.onMovementsPageChange(3)

    await props.onSubmit({
      product_id: 'prod-1',
      type: 'entry',
      quantity: 3,
      reason: 'Compra',
    })
    await props.onCloseDay()

    const createMovementMutateAsync = useCreateMovementMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    const closeDayMutateAsync = useCloseDayMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(createMovementMutateAsync).toHaveBeenCalledWith({
      product_id: 'prod-1',
      type: 'entry',
      quantity: 3,
      reason: 'Compra',
    })
    expect(formResetMock).toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledWith('Confirma o fechamento do estoque de hoje?')
    expect(closeDayMutateAsync).toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith('Fechamento realizado! 1 produtos registrados.')
  })

  it('cobre ramos de erro e cancelamento da página', async () => {
    const createMovementMutateAsync = vi.fn().mockRejectedValue(new Error('Erro ao registrar'))
    const closeDayMutateAsync = vi.fn().mockRejectedValue(new Error('Falha no fechamento'))

    useCreateMovementMock.mockReturnValue({
      mutateAsync: createMovementMutateAsync,
    })
    useCloseDayMock.mockReturnValue({
      isPending: true,
      mutateAsync: closeDayMutateAsync,
    })
    vi.stubGlobal('confirm', vi.fn(() => false))

    const { default: EstoquePage } = await import('@/app/(dashboard)/estoque/page')

    renderToStaticMarkup(React.createElement(EstoquePage))

    const props = capturedStockPageContentProps as {
      closeDayPending: boolean
      onCloseDay: () => Promise<void>
      onSubmit: (values: {
        product_id: string
        type: 'entry' | 'exit' | 'loss' | 'adjustment'
        quantity: number
        reason?: string
      }) => Promise<void>
    }

    expect(props.closeDayPending).toBe(true)

    await props.onCloseDay()

    expect(closeDayMutateAsync).not.toHaveBeenCalled()

    await props.onSubmit({
      product_id: 'prod-1',
      type: 'loss',
      quantity: 1,
      reason: 'Quebrou',
    })

    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Erro ao registrar',
    })

    vi.stubGlobal('confirm', vi.fn(() => true))

    await props.onCloseDay()

    expect(closeDayMutateAsync).toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith('Falha no fechamento')
  })
})
