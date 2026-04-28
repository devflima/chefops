import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useCategoriesMock = vi.fn()
const useQueryMock = vi.fn()
const usePlanMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const invalidateQueriesMock = vi.fn()
const formResetMock = vi.fn()
const formSetErrorMock = vi.fn()

let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []
let capturedCategoriesProps: Record<string, unknown> | null = null
let capturedExtrasProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => {
      const index = useStateMock.mock.calls.length
      const setter = vi.fn()
      stateSetters.push(setter)
      useStateMock(initial)
      return [index in stateValues ? stateValues[index] : initial, setter]
    },
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
    control: {},
    reset: formResetMock,
    setError: formSetErrorMock,
    handleSubmit: vi.fn((callback: (values: unknown) => unknown) => callback),
    watch: vi.fn(() => 'other'),
    formState: {
      isSubmitting: false,
      errors: {},
    },
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

vi.mock('@/features/products/hooks/useProducts', () => ({
  useCategories: () => useCategoriesMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
  useCanAddMore: (...args: Parameters<typeof useCanAddMoreMock>) => useCanAddMoreMock(...args),
}))

vi.mock('@/features/products/CategoriesPageContent', () => ({
  CategoriesPageContent: (props: Record<string, unknown>) => {
    capturedCategoriesProps = props
    return React.createElement('div', null, 'Categories Edit Content Mock')
  },
}))

vi.mock('@/features/products/ExtrasPageContent', () => ({
  ExtrasPageContent: (props: Record<string, unknown>) => {
    capturedExtrasProps = props
    return React.createElement('div', null, 'Extras Edit Content Mock')
  },
}))

describe('catalog pages edit branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateValues = []
    stateSetters = []
    capturedCategoriesProps = null
    capturedExtrasProps = null

    usePlanMock.mockReturnValue({
      data: {
        resource_limits: {
          categories: 20,
          extras: 20,
        },
      },
    })
    useCanAddMoreMock.mockReturnValue(true)
    invalidateQueriesMock.mockResolvedValue(undefined)
    useCategoriesMock.mockReturnValue({
      data: [],
      isLoading: false,
    })
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
    })
  })

  it('cobre o submit de edicao da página de categorias', async () => {
    stateValues[1] = {
      id: 'cat-1',
      name: 'Pizzas',
      display_order: 1,
      goes_to_kitchen: true,
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { id: 'cat-1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')

    expect(renderToStaticMarkup(React.createElement(CategoriasPage))).toContain(
      'Categories Edit Content Mock'
    )

    const props = capturedCategoriesProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      name: 'Pizzas Premium',
      display_order: 2,
      goes_to_kitchen: false,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'cat-1',
        name: 'Pizzas Premium',
        display_order: 2,
        goes_to_kitchen: false,
      }),
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['categories'] })
  })

  it('cobre o submit de edicao da página de extras', async () => {
    stateValues[1] = {
      id: 'extra-1',
      name: 'Borda',
      category: 'border',
      price: 10,
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { id: 'extra-1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')

    expect(renderToStaticMarkup(React.createElement(ExtrasPage))).toContain(
      'Extras Edit Content Mock'
    )

    const props = capturedExtrasProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      name: 'Borda Cheddar',
      category: 'border',
      price: 12,
      target_categories: [],
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/extras/extra-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Borda Cheddar',
        category: 'border',
        price: 12,
        target_categories: [],
      }),
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['extras'] })
  })

  it('cobre filtros e fechamento de modal nas páginas de categorias e extras', async () => {
    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')

    expect(renderToStaticMarkup(React.createElement(CategoriasPage))).toContain(
      'Categories Edit Content Mock'
    )

    const categoryProps = capturedCategoriesProps as {
      onNameFilterChange: (value: string) => void
      onDestinationFilterChange: (value: 'all' | 'kitchen' | 'counter') => void
      onOpenChange: (open: boolean) => void
    }

    categoryProps.onNameFilterChange('doces')
    categoryProps.onDestinationFilterChange('counter')
    categoryProps.onOpenChange(false)

    expect(stateSetters[5]).toHaveBeenCalledWith('doces')
    expect(stateSetters[4]).toHaveBeenCalledWith('counter')
    expect(stateSetters[3]).toHaveBeenCalledTimes(2)
    expect(stateSetters[3]).toHaveBeenCalledWith(1)
    expect(stateSetters[0]).toHaveBeenCalledWith(false)

    stateValues = []
    stateSetters = []
    capturedExtrasProps = null

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')

    expect(renderToStaticMarkup(React.createElement(ExtrasPage))).toContain(
      'Extras Edit Content Mock'
    )

    const extrasProps = capturedExtrasProps as {
      onNameFilterChange: (value: string) => void
      onCategoryFilterChange: (value: 'all' | 'border' | 'flavor' | 'other') => void
      onOpenChange: (open: boolean) => void
    }

    extrasProps.onNameFilterChange('molho')
    extrasProps.onCategoryFilterChange('other')
    extrasProps.onOpenChange(false)

    expect(stateSetters[4]).toHaveBeenCalledWith('molho')
    expect(stateSetters[3]).toHaveBeenCalledWith('other')
    expect(stateSetters[2]).toHaveBeenCalledTimes(2)
    expect(stateSetters[2]).toHaveBeenCalledWith(1)
    expect(stateSetters[0]).toHaveBeenCalledWith(false)
  })

  it('cobre criação com erro genérico e delete abortado/fracassado em categorias', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce('network-failure')
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true))
    vi.stubGlobal('alert', vi.fn())

    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')

    renderToStaticMarkup(React.createElement(CategoriasPage))

    const props = capturedCategoriesProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
      onDelete: (category: { id: string; name: string }) => Promise<void>
    }

    await props.onSubmit({
      name: 'Doces',
      display_order: 4,
      goes_to_kitchen: true,
    })

    await props.onDelete({ id: 'cat-1', name: 'Pizzas' })
    await props.onDelete({ id: 'cat-1', name: 'Pizzas' })

    expect(fetchMock).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Doces',
        display_order: 4,
        goes_to_kitchen: true,
      }),
    })
    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Erro ao salvar categoria.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/categories?id=cat-1', {
      method: 'DELETE',
    })
    expect(alert).toHaveBeenCalledWith('Erro ao excluir categoria.')
    expect(stateSetters[2]).toHaveBeenCalledWith('cat-1')
    expect(stateSetters[2]).toHaveBeenCalledWith(null)
  })

  it('cobre erro de resposta não-ok na edição de categorias', async () => {
    stateValues[1] = {
      id: 'cat-20',
      name: 'Massas',
      display_order: 3,
      goes_to_kitchen: true,
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Falha ao atualizar categoria' }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')

    renderToStaticMarkup(React.createElement(CategoriasPage))

    const props = capturedCategoriesProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      name: 'Massas artesanais',
      display_order: 4,
      goes_to_kitchen: false,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'cat-20',
        name: 'Massas artesanais',
        display_order: 4,
        goes_to_kitchen: false,
      }),
    })
    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Falha ao atualizar categoria',
    })
  })

  it('cobre queryFn real, criação e delete abortado em extras', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{ id: 'extra-1', name: 'Molho', category: 'other', price: 3 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { id: 'extra-2' } }),
      })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => false))

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')

    renderToStaticMarkup(React.createElement(ExtrasPage))

    const props = capturedExtrasProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
      onDelete: (extra: { id: string; name: string }) => Promise<void>
    }
    const queryOptions = useQueryMock.mock.calls[0]?.[0] as
      | { queryKey: string[]; queryFn: () => Promise<unknown> }
      | undefined

    expect(queryOptions?.queryKey).toEqual(['extras'])
    await expect(queryOptions?.queryFn()).resolves.toEqual([
      { id: 'extra-1', name: 'Molho', category: 'other', price: 3 },
    ])

    await props.onSubmit({
      name: 'Molho especial',
      category: 'other',
      price: 4,
      target_categories: [],
    })

    await props.onDelete({ id: 'extra-1', name: 'Molho' })

    expect(fetchMock).toHaveBeenCalledWith('/api/extras')
    expect(fetchMock).toHaveBeenCalledWith('/api/extras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Molho especial',
        category: 'other',
        price: 4,
        target_categories: [],
      }),
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(stateSetters[0]).toHaveBeenCalledWith(false)
  })

  it('cobre openCreate, openEdit, erro genérico no submit e delete confirmado em extras', async () => {
    stateValues[1] = {
      id: 'extra-10',
      name: 'Catupiry',
      category: 'border',
      price: 8,
    }

    const fetchMock = vi.fn()
      .mockRejectedValueOnce('network-failure')
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => true))

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')

    renderToStaticMarkup(React.createElement(ExtrasPage))

    const props = capturedExtrasProps as {
      openCreate: () => void
      openEdit: (extra: { id: string; name: string; category: 'border' | 'flavor' | 'other'; price: number }) => void
      onSubmit: (values: Record<string, unknown>) => Promise<void>
      onDelete: (extra: { id: string; name: string }) => Promise<void>
    }

    props.openCreate()
    props.openEdit({
      id: 'extra-10',
      name: 'Catupiry',
      category: 'border',
      price: 8,
    })

    await props.onSubmit({
      name: 'Catupiry Premium',
      category: 'border',
      price: 10,
      target_categories: [],
    })

    await props.onDelete({ id: 'extra-10', name: 'Catupiry' })

    expect(formResetMock).toHaveBeenCalledWith({
      name: '',
      price: 0,
      category: 'other',
      target_categories: [],
    })
    expect(formResetMock).toHaveBeenCalledWith({
      name: 'Catupiry',
      price: 8,
      category: 'border',
      target_categories: [],
    })
    expect(stateSetters[1]).toHaveBeenCalledWith(null)
    expect(stateSetters[0]).toHaveBeenCalledWith(true)
    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Erro ao salvar adicional.',
    })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/extras/extra-10', {
      method: 'DELETE',
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['extras'] })
  })

  it('cobre erro de resposta não-ok na edição de extras', async () => {
    stateValues[1] = {
      id: 'extra-20',
      name: 'Molho verde',
      category: 'other',
      price: 5,
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')

    renderToStaticMarkup(React.createElement(ExtrasPage))

    const props = capturedExtrasProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      name: 'Molho verde',
      category: 'other',
      price: 5,
      target_categories: [],
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/extras/extra-20', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Molho verde',
        category: 'other',
        price: 5,
        target_categories: [],
      }),
    })
    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Erro ao salvar adicional.',
    })
  })
})
