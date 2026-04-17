import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
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

let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []
let capturedMenuDashboardPageContentProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
  }
})

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
    return React.createElement('div', null, 'Menu Dashboard Stateful Content Mock')
  },
}))

describe('CardapioPage stateful branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateValues = []
    stateSetters = []
    capturedMenuDashboardPageContentProps = null

    useStateMock.mockImplementation((initial: unknown) => {
      const setter = vi.fn()
      const index = stateSetters.length
      stateSetters.push(setter)
      return [index in stateValues ? stateValues[index] : initial, setter]
    })

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
    useHasFeatureMock.mockReturnValue(false)
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
  })

  it('cobre edição sem automação de estoque e sem request de ingredientes', async () => {
    stateValues[1] = {
      id: 'item-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    }
    stateValues[6] = ['extra-1']

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/menu-items/item-1/extras') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ id: 'extra-1' }],
          }),
        }
      }

      if (url === '/api/menu-items/item-1') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { id: 'item-1' } }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    expect(renderToStaticMarkup(React.createElement(CardapioPage))).toContain(
      'Menu Dashboard Stateful Content Mock'
    )

    const props = capturedMenuDashboardPageContentProps as {
      onEdit: (item: Record<string, unknown>) => Promise<void>
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

    await props.onEdit({
      id: 'item-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    })

    await props.dialogProps.onSubmit({
      name: 'Pizza Margherita Especial',
      description: 'Nova versão',
      price: 38,
      category_id: 'cat-1',
      display_order: 3,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-1/extras')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/menu-items/item-1/ingredients')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/menu-items/item-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pizza Margherita Especial',
        description: 'Nova versão',
        price: 38,
        display_order: 3,
        category_id: 'cat-1',
        product_id: null,
      }),
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-1/extras', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_ids: ['extra-1'] }),
    })
    expect(fetchMock).not.toHaveBeenCalledWith('/api/menu-items/item-1/ingredients', expect.anything())
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['menu-items'] })
  })

  it('cobre criação com sucesso e erro no toggle de disponibilidade', async () => {
    stateValues[0] = true
    stateValues[1] = null
    stateValues[2] = 'item-1'
    stateValues[6] = ['extra-1']

    const createMenuItemMutateAsync = vi.fn().mockResolvedValue({ id: 'item-created' })
    useCreateMenuItemMock.mockReturnValue({
      mutateAsync: createMenuItemMutateAsync,
    })

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/menu-items/item-created/extras') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: null }),
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
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const props = capturedMenuDashboardPageContentProps as {
      dialogProps: {
        onSubmit: (values: {
          name: string
          description?: string
          price: number
          category_id?: string
          display_order: number
        }) => Promise<void>
      }
      onToggleAvailable: (item: Record<string, unknown>) => Promise<void>
    }

    await props.dialogProps.onSubmit({
      name: 'Nova Pizza',
      description: 'Especial',
      price: 40,
      category_id: 'cat-1',
      display_order: 2,
    })

    await props.onToggleAvailable({
      id: 'item-1',
      name: 'Pizza Margherita',
      available: true,
    })

    expect(createMenuItemMutateAsync).toHaveBeenCalledWith({
      name: 'Nova Pizza',
      description: 'Especial',
      price: 40,
      category_id: 'cat-1',
      display_order: 2,
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-created/extras', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_ids: ['extra-1'] }),
    })
    expect(stateSetters[0]).toHaveBeenCalledWith(false)
    expect(stateSetters[6]).toHaveBeenCalledWith([])
    expect(stateSetters[7]).toHaveBeenCalledWith('none')
    expect(stateSetters[8]).toHaveBeenCalledWith([])
    expect(alert).toHaveBeenCalledWith('Erro ao desativar item.')
    expect(stateSetters[2]).toHaveBeenCalledWith('item-1')
    expect(stateSetters[2]).toHaveBeenCalledWith(null)
  })

  it('cobre edição com automação de estoque e carrega ingredientes existentes', async () => {
    useHasFeatureMock.mockReturnValue(true)

    const fetchMock = vi.fn(async (url: string) => {
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
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const props = capturedMenuDashboardPageContentProps as {
      onEdit: (item: Record<string, unknown>) => Promise<void>
    }

    await props.onEdit({
      id: 'item-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-1/extras')
    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-1/ingredients')
    expect(stateSetters[1]).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'item-1',
        product_id: 'prod-1',
      }),
    )
    expect(stateSetters[6]).toHaveBeenCalledWith(['extra-1'])
    expect(stateSetters[8]).toHaveBeenCalledWith([{ product_id: 'prod-1', quantity: 2 }])
    expect(stateSetters[7]).toHaveBeenCalledWith('prod-1')
    expect(stateSetters[0]).toHaveBeenCalledWith(true)
  })

  it('cobre ingredientes nulos na edição e erro explícito no PATCH', async () => {
    useHasFeatureMock.mockReturnValue(true)
    stateValues[1] = {
      id: 'item-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    }

    const fetchMock = vi.fn(async (url: string) => {
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
            data: null,
          }),
        }
      }

      if (url === '/api/menu-items/item-1') {
        return {
          ok: false,
          json: vi.fn().mockResolvedValue({
            error: 'Falha ao atualizar item',
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const props = capturedMenuDashboardPageContentProps as {
      onEdit: (item: Record<string, unknown>) => Promise<void>
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

    await props.onEdit({
      id: 'item-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    })

    await props.dialogProps.onSubmit({
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 32,
      category_id: 'cat-1',
      display_order: 1,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-1/extras')
    expect(fetchMock).toHaveBeenCalledWith('/api/menu-items/item-1/ingredients')
    expect(stateSetters[8]).toHaveBeenCalledWith([])
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/menu-items/item-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pizza Margherita',
        description: 'Clássica',
        price: 32,
        display_order: 1,
        category_id: 'cat-1',
        product_id: null,
      }),
    })
    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Falha ao atualizar item',
    })
  })

  it('cobre callbacks stateful do diálogo e dos filtros', async () => {
    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const props = capturedMenuDashboardPageContentProps as {
      onCreate: () => void
      onCategoryFilterChange: (value: string) => void
      onStatusFilterChange: (value: 'all' | 'available' | 'inactive') => void
      dialogProps: {
        onOpenChange: (open: boolean) => void
        onLinkedProductChange: (value: string) => void
        onAddIngredient: () => void
        onUpdateIngredient: (index: number, patch: { product_id?: string; quantity?: number }) => void
        onRemoveIngredient: (index: number) => void
      }
    }

    props.onCreate()
    props.onCategoryFilterChange('cat-1')
    props.onStatusFilterChange('inactive')
    props.dialogProps.onOpenChange(false)
    props.dialogProps.onLinkedProductChange('prod-1')
    props.dialogProps.onAddIngredient()
    props.dialogProps.onUpdateIngredient(0, { product_id: 'prod-1', quantity: 2 })
    props.dialogProps.onRemoveIngredient(0)

    expect(formResetMock).toHaveBeenCalled()
    expect(stateSetters[1]).toHaveBeenCalledWith(null)
    expect(stateSetters[7]).toHaveBeenCalledWith('none')
    expect(stateSetters[8]).toHaveBeenCalledWith([])
    expect(stateSetters[6]).toHaveBeenCalledWith([])
    expect(stateSetters[0]).toHaveBeenCalledWith(true)
    expect(stateSetters[0]).toHaveBeenCalledWith(false)
    expect(stateSetters[5]).toHaveBeenCalledWith('cat-1')
    expect(stateSetters[4]).toHaveBeenCalledWith('inactive')
    expect(stateSetters[3]).toHaveBeenCalledWith(1)
    expect(stateSetters[7]).toHaveBeenCalledWith('prod-1')

    const addIngredientUpdater = stateSetters[8].mock.calls[1]?.[0] as (value: Array<{ product_id: string; quantity: number }>) => Array<{ product_id: string; quantity: number }>
    const updateIngredientUpdater = stateSetters[8].mock.calls[2]?.[0] as (value: Array<{ product_id: string; quantity: number }>) => Array<{ product_id: string; quantity: number }>
    const removeIngredientUpdater = stateSetters[8].mock.calls[3]?.[0] as (value: Array<{ product_id: string; quantity: number }>) => Array<{ product_id: string; quantity: number }>

    expect(addIngredientUpdater([])).toEqual([{ product_id: 'none', quantity: 1 }])
    expect(updateIngredientUpdater([{ product_id: 'none', quantity: 1 }])).toEqual([
      { product_id: 'prod-1', quantity: 2 },
    ])
    expect(removeIngredientUpdater([{ product_id: 'prod-1', quantity: 2 }])).toEqual([])
  })

  it('executa a queryFn real dos extras do cardápio', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 'extra-1', name: 'Borda recheada', price: 5, category: 'Bordas' }],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')

    renderToStaticMarkup(React.createElement(CardapioPage))

    const queryOptions = useQueryMock.mock.calls[0]?.[0] as
      | { queryKey: string[]; queryFn: () => Promise<unknown> }
      | undefined

    expect(queryOptions?.queryKey).toEqual(['extras'])
    await expect(queryOptions?.queryFn()).resolves.toEqual([
      { id: 'extra-1', name: 'Borda recheada', price: 5, category: 'Bordas' },
    ])
    expect(fetchMock).toHaveBeenCalledWith('/api/extras')
  })
})
