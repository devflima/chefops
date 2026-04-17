import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useMenuItemsMock = vi.fn()
const useCreateMenuItemMock = vi.fn()
const useCategoriesMock = vi.fn()
const useProductsMock = vi.fn()
const useQueryMock = vi.fn()
const invalidateQueriesMock = vi.fn()
const useHasFeatureMock = vi.fn()
const usePlanMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const formResetMock = vi.fn()
const formSetErrorMock = vi.fn()

let capturedMenuDashboardPageContentProps: Record<string, unknown> | null = null

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
  useQuery: (...args: Parameters<typeof useQueryMock>) => useQueryMock(...args),
}))

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    reset: formResetMock,
    setError: formSetErrorMock,
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useMenuItems: () => useMenuItemsMock(),
  useCreateMenuItem: () => useCreateMenuItemMock(),
}))

vi.mock('@/features/products/hooks/useProducts', () => ({
  useCategories: () => useCategoriesMock(),
  useProducts: () => useProductsMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  useHasFeature: (feature: string) => useHasFeatureMock(feature),
  usePlan: () => usePlanMock(),
  useCanAddMore: (...args: Parameters<typeof useCanAddMoreMock>) => useCanAddMoreMock(...args),
}))

vi.mock('@/features/menu/MenuDashboardPageContent', () => ({
  MenuDashboardPageContent: (props: Record<string, unknown>) => {
    capturedMenuDashboardPageContentProps = props
    return React.createElement('div', null, 'Menu Dashboard Page Content Mock')
  },
}))

describe('CardapioPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedMenuDashboardPageContentProps = null

    useMenuItemsMock.mockReturnValue({
      data: [
        {
          id: 'item-1',
          name: 'Pizza Margherita',
          description: 'Clássica',
          price: 32,
          category_id: 'cat-1',
          display_order: 1,
          available: true,
          product_id: 'prod-1',
        },
      ],
      isLoading: false,
    })
    useCategoriesMock.mockReturnValue({
      data: [{ id: 'cat-1', name: 'Pizzas' }],
    })
    useProductsMock.mockReturnValue({
      data: [{ id: 'prod-1', name: 'Queijo', unit: 'kg' }],
    })
    useCreateMenuItemMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'item-created' }),
    })
    useQueryMock.mockReturnValue({
      data: [{ id: 'extra-1', name: 'Borda recheada', price: 5, category: 'Bordas' }],
    })
    useHasFeatureMock.mockReturnValue(true)
    usePlanMock.mockReturnValue({
      data: {
        plan: 'basic',
        resource_limits: {
          menu_items: 10,
        },
      },
    })
    useCanAddMoreMock.mockReturnValue(true)
    invalidateQueriesMock.mockResolvedValue(undefined)

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/menu-items/item-1/extras') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ id: 'extra-1' }],
          }),
        }
      }

      if (url === '/api/menu-items/item-1/ingredients') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ product_id: 'prod-1', quantity: 2 }],
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      }
    }))
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais da página', async () => {
    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    expect(renderToStaticMarkup(React.createElement(CardapioPage))).toContain('Menu Dashboard Page Content Mock')
    expect(capturedMenuDashboardPageContentProps).toBeTruthy()

    const props = capturedMenuDashboardPageContentProps as {
      availableCount: number
      inactiveCount: number
      limitLabel: string
      menuItemLimitReached: boolean
      planName?: string
      menuItemLimit?: number
      page: number
      totalPages: number
      categories?: Array<{ id: string; name: string }>
      dialogProps: {
        onSubmit: (values: {
          name: string
          description?: string
          price: number
          category_id?: string
          display_order: number
        }) => Promise<void>
      }
      onCreate: () => void
      onCategoryFilterChange: (value: string) => void
      onStatusFilterChange: (value: 'all' | 'available' | 'inactive') => void
      onPageChange: (page: number) => void
      onEdit: (item: Record<string, unknown>) => Promise<void>
      onToggleAvailable: (item: Record<string, unknown>) => Promise<void>
    }

    expect(props.availableCount).toBe(1)
    expect(props.inactiveCount).toBe(0)
    expect(props.limitLabel).toBe('1/10 no plano')
    expect(props.menuItemLimitReached).toBe(false)
    expect(props.planName).toBe('basic')
    expect(props.menuItemLimit).toBe(10)
    expect(props.page).toBe(1)
    expect(props.totalPages).toBe(1)
    expect(props.categories).toEqual([{ id: 'cat-1', name: 'Pizzas' }])

    props.onCreate()
    props.onCategoryFilterChange('cat-1')
    props.onStatusFilterChange('inactive')
    props.onPageChange(2)

    await props.onEdit({
      id: 'item-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    })

    await props.onToggleAvailable({
      id: 'item-1',
      name: 'Pizza Margherita',
      available: true,
    })

    await props.dialogProps.onSubmit({
      name: 'Pizza Calabresa',
      description: 'Picante',
      price: 35,
      category_id: 'cat-1',
      display_order: 2,
    })

    const createMenuItemMutateAsync = useCreateMenuItemMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(formResetMock).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith('/api/menu-items/item-1/extras')
    expect(fetch).toHaveBeenCalledWith('/api/menu-items/item-1/ingredients')
    expect(confirm).toHaveBeenCalledWith('Deseja desativar "Pizza Margherita"?')
    expect(fetch).toHaveBeenCalledWith('/api/menu-items/item-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: false }),
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['menu-items'] })
    expect(createMenuItemMutateAsync).toHaveBeenCalledWith({
      name: 'Pizza Calabresa',
      description: 'Picante',
      price: 35,
      category_id: 'cat-1',
      display_order: 2,
      product_id: undefined,
    })
    expect(fetch).toHaveBeenCalledWith('/api/menu-items/item-created/extras', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_ids: [] }),
    })
    expect(fetch).toHaveBeenCalledWith('/api/menu-items/item-created/ingredients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: [] }),
    })
  })

  it('cobre limite do plano e ramos de erro/cancelamento da página', async () => {
    useCanAddMoreMock.mockReturnValue(false)
    useHasFeatureMock.mockReturnValue(false)

    const createMenuItemMutateAsync = vi.fn().mockRejectedValue(new Error('Erro ao criar item'))
    useCreateMenuItemMock.mockReturnValue({
      mutateAsync: createMenuItemMutateAsync,
    })

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/menu-items/item-1/extras') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        }
      }

      if (url === '/api/menu-items/item-1') {
        return {
          ok: false,
          json: vi.fn().mockResolvedValue({}),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => false))

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const props = capturedMenuDashboardPageContentProps as {
      menuItemLimitReached: boolean
      onToggleAvailable: (item: Record<string, unknown>) => Promise<void>
      dialogProps: {
        onSubmit: (values: {
          name: string
          description?: string
          price: number
          category_id?: string
          display_order: number
        }) => Promise<void>
      }
    }

    expect(props.menuItemLimitReached).toBe(true)

    await props.onToggleAvailable({
      id: 'item-1',
      name: 'Pizza Margherita',
      available: true,
    })

    expect(fetchMock).not.toHaveBeenCalledWith('/api/menu-items/item-1', expect.anything())

    vi.stubGlobal('confirm', vi.fn(() => true))

    await props.onToggleAvailable({
      id: 'item-1',
      name: 'Pizza Margherita',
      available: false,
    })

    await props.dialogProps.onSubmit({
      name: 'Pizza de erro',
      description: 'Falhou',
      price: 22,
      category_id: 'cat-1',
      display_order: 3,
    })

    expect(confirm).toHaveBeenCalledWith('Deseja reativar "Pizza Margherita"?')
    expect(alert).toHaveBeenCalledWith('Erro ao reativar item.')
    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Erro ao criar item',
    })
  })

  it('cobre fallbacks de dados vazios e criação sem id retornado', async () => {
    useMenuItemsMock.mockReturnValue({
      data: null,
      isLoading: false,
    })
    useCategoriesMock.mockReturnValue({
      data: undefined,
    })
    useProductsMock.mockReturnValue({
      data: undefined,
    })
    useQueryMock.mockReturnValue({
      data: undefined,
    })
    useHasFeatureMock.mockReturnValue(false)
    usePlanMock.mockReturnValue({
      data: null,
    })
    useCanAddMoreMock.mockReturnValue(true)

    const createMenuItemMutateAsync = vi.fn().mockResolvedValue({})
    useCreateMenuItemMock.mockReturnValue({
      mutateAsync: createMenuItemMutateAsync,
    })

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const props = capturedMenuDashboardPageContentProps as {
      availableCount: number
      inactiveCount: number
      limitLabel?: string
      menuItemLimitReached: boolean
      categories?: Array<{ id: string; name: string }>
      items: unknown[]
      paginatedItems: unknown[]
      planName?: string
      menuItemLimit?: number
      totalPages: number
      dialogProps: {
        products?: Array<{ id: string; name: string }>
        allExtras?: Array<{ id: string; name: string }>
        onSubmit: (values: {
          name: string
          description?: string
          price: number
          category_id?: string
          display_order: number
        }) => Promise<void>
      }
    }

    expect(props.availableCount).toBe(0)
    expect(props.inactiveCount).toBe(0)
    expect(props.limitLabel).toBe('0/undefined no plano')
    expect(props.menuItemLimitReached).toBe(false)
    expect(props.categories).toBeUndefined()
    expect(props.items).toEqual([])
    expect(props.paginatedItems).toEqual([])
    expect(props.planName).toBeUndefined()
    expect(props.menuItemLimit).toBeUndefined()
    expect(props.totalPages).toBe(1)
    expect(props.dialogProps.products).toBeUndefined()
    expect(props.dialogProps.allExtras).toBeUndefined()

    await props.dialogProps.onSubmit({
      name: 'Pizza sem id',
      description: 'Fallback',
      price: 20,
      category_id: 'cat-1',
      display_order: 1,
    })

    expect(useCanAddMoreMock).toHaveBeenCalledWith('menu_items', 0)
    expect(createMenuItemMutateAsync).toHaveBeenCalledWith({
      name: 'Pizza sem id',
      description: 'Fallback',
      price: 20,
      category_id: 'cat-1',
      display_order: 1,
      product_id: undefined,
    })
    expect(fetchMock).not.toHaveBeenCalledWith('/api/menu-items/undefined/extras', expect.anything())
    expect(formResetMock).toHaveBeenCalled()
  })
})
