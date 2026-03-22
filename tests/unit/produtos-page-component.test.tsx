import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useProductsMock = vi.fn()
const useCategoriesMock = vi.fn()
const useCreateProductMock = vi.fn()
const useUpdateProductMock = vi.fn()
const usePlanMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const formResetMock = vi.fn()
const formSetErrorMock = vi.fn()
const capturedButtons: Array<Record<string, unknown>> = []
let capturedDialogChildren: React.ReactNode = null
let capturedPaginationProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    capturedButtons.push({ ...props, children })
    return React.createElement('button', props, children)
  },
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', props, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => {
    capturedDialogChildren = children
    return React.createElement('div', null, children)
  },
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
  DialogTrigger: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormControl: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormField: ({
    name,
    render,
  }: {
    name: string
    render: (args: { field: Record<string, unknown> }) => React.ReactNode
  }) =>
    React.createElement(
      React.Fragment,
      null,
      render({
        field: {
          name,
          value: name === 'unit' ? 'un' : '',
          onChange: vi.fn(),
        },
      }),
    ),
  FormItem: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) => React.createElement('label', null, children),
  FormMessage: () => React.createElement('span', null, 'form-message'),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectItem: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('option', props, children),
  SelectTrigger: ({ children }: React.PropsWithChildren) => React.createElement('button', null, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => React.createElement('span', null, placeholder ?? 'select'),
}))

vi.mock('@/components/shared/PaginationControls', () => ({
  default: (props: { page: number; totalPages: number; onPageChange: (page: number) => void }) => {
    capturedPaginationProps = props
    return React.createElement('div', null, `pagination-${props.page}-${props.totalPages}`)
  },
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Plus: Icon,
    Package: Icon,
  }
})

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    formState: { isSubmitting: false, errors: {} },
    reset: formResetMock,
    setError: formSetErrorMock,
    handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => () =>
      callback({
        name: 'Farinha',
        sku: 'FR-1',
        category_id: 'cat-1',
        unit: 'kg',
        cost_price: 12,
        min_stock: 2,
      }),
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

vi.mock('@/features/products/hooks/useProducts', () => ({
  useProducts: (...args: Parameters<typeof useProductsMock>) => useProductsMock(...args),
  useCategories: () => useCategoriesMock(),
  useCreateProduct: () => useCreateProductMock(),
  useUpdateProduct: () => useUpdateProductMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
  useCanAddMore: (...args: Parameters<typeof useCanAddMoreMock>) => useCanAddMoreMock(...args),
}))

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (!node || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap(flattenElements)
  }

  if (!React.isValidElement(node)) {
    return []
  }

  return [node, ...flattenElements(node.props.children)]
}

function getDialogFormSubmitHandler() {
  return flattenElements(capturedDialogChildren).find((element) => element.type === 'form')?.props.onSubmit as
    | (() => unknown)
    | undefined
}

function getButtonByText(label: string) {
  return capturedButtons.find((button) => {
    const content = button.children
    if (Array.isArray(content)) {
      return content.some((item) => typeof item === 'string' && item.includes(label))
    }

    return typeof content === 'string' && content.includes(label)
  })
}

describe('ProdutosPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStateMock.mockImplementation((initial: unknown) => [initial, vi.fn()])
    capturedButtons.length = 0
    capturedDialogChildren = null
    capturedPaginationProps = null

    useProductsMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'prod-1',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            name: 'Farinha',
            sku: 'FR-1',
            unit: 'kg',
            cost_price: 12,
            min_stock: 2,
            active: true,
            category: { id: 'cat-1', name: 'Secos' },
          },
        ],
        count: 1,
      },
      isLoading: false,
    })
    useCategoriesMock.mockReturnValue({
      data: [{ id: 'cat-1', name: 'Secos' }],
    })
    useCreateProductMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useUpdateProductMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    usePlanMock.mockReturnValue({
      data: { max_products: 10 },
    })
    useCanAddMoreMock.mockReturnValue(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza listagem e aciona criação e edição', async () => {
    const setPageMock = vi.fn()
    const setCategoryFilterMock = vi.fn()
    const setStatusFilterMock = vi.fn()
    const setOpenMock = vi.fn()
    const setEditingMock = vi.fn()

    useStateMock
      .mockImplementationOnce(() => [1, setPageMock])
      .mockImplementationOnce(() => ['all', setCategoryFilterMock])
      .mockImplementationOnce(() => ['active', setStatusFilterMock])
      .mockImplementationOnce(() => [false, setOpenMock])
      .mockImplementationOnce(() => [null, setEditingMock])

    const { default: ProdutosPage } = await import('@/app/(dashboard)/produtos/page')

    const markup = renderToStaticMarkup(React.createElement(ProdutosPage))

    expect(markup).toContain('Produtos')
    expect(markup).toContain('1 produtos cadastrados')
    expect(markup).toContain('Farinha')
    expect(markup).toContain('SKU: FR-1')
    expect(markup).toContain('Secos')
    expect(markup).toContain('Kg')
    expect(markup).toContain('Ativo')
    expect(markup).toContain('pagination-1-1')

    const novoProdutoButton = getButtonByText('Novo produto')
    const editarButton = getButtonByText('Editar')
    const paginationProps = capturedPaginationProps as { onPageChange: (page: number) => void }

    ;(novoProdutoButton?.onClick as (() => void) | undefined)?.()
    ;(editarButton?.onClick as (() => void) | undefined)?.()
    paginationProps.onPageChange(3)

    expect(formResetMock).toHaveBeenCalledWith({
      name: '',
      sku: '',
      unit: 'un',
      cost_price: 0,
      min_stock: 0,
    })
    expect(formResetMock).toHaveBeenCalledWith({
      name: 'Farinha',
      sku: 'FR-1',
      category_id: 'cat-1',
      unit: 'kg',
      cost_price: 12,
      min_stock: 2,
    })
    expect(setEditingMock).toHaveBeenCalledWith(null)
    expect(setEditingMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }))
    expect(setOpenMock).toHaveBeenCalledWith(true)
    expect(setPageMock).toHaveBeenCalledWith(3)

    const createProductMutateAsync = useCreateProductMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    const updateProductMutateAsync = useUpdateProductMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(createProductMutateAsync).not.toHaveBeenCalled()
    expect(updateProductMutateAsync).not.toHaveBeenCalled()
  })

  it('renderiza estados alternativos de loading, vazio e limite de plano', async () => {
    useProductsMock.mockReturnValueOnce({
      data: { data: [], count: 10 },
      isLoading: true,
    })
    useCanAddMoreMock.mockReturnValueOnce(false)

    const { default: ProdutosPage } = await import('@/app/(dashboard)/produtos/page')
    const loadingMarkup = renderToStaticMarkup(React.createElement(ProdutosPage))

    expect(loadingMarkup).toContain('Carregando...')
    expect(loadingMarkup).toContain('O plano atual atingiu o limite de 10 produtos.')

    useProductsMock.mockReturnValueOnce({
      data: { data: [], count: 0 },
      isLoading: false,
    })
    useCanAddMoreMock.mockReturnValueOnce(true)

    const emptyMarkup = renderToStaticMarkup(React.createElement(ProdutosPage))
    expect(emptyMarkup).toContain('Nenhum produto cadastrado.')
    expect(emptyMarkup).toContain('Cadastrar primeiro produto')
  })

  it('submete criação, edição e erro do formulário no componente real', async () => {
    const setOpenCreateMock = vi.fn()
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [true, setOpenCreateMock])
      .mockImplementationOnce(() => [null, vi.fn()])

    const { default: ProdutosPageCreate } = await import('@/app/(dashboard)/produtos/page')
    renderToStaticMarkup(React.createElement(ProdutosPageCreate))
    await getDialogFormSubmitHandler()?.()

    const createProductMutateAsync = useCreateProductMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    expect(createProductMutateAsync).toHaveBeenCalledWith({
      name: 'Farinha',
      sku: 'FR-1',
      category_id: 'cat-1',
      unit: 'kg',
      cost_price: 12,
      min_stock: 2,
    })
    expect(setOpenCreateMock).toHaveBeenCalledWith(false)

    const setOpenEditMock = vi.fn()
    const setEditingEditMock = vi.fn()
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [true, setOpenEditMock])
      .mockImplementationOnce(() => [{
        id: 'prod-1',
        tenant_id: 'tenant-1',
        category_id: 'cat-1',
        name: 'Farinha',
        sku: 'FR-1',
        unit: 'kg',
        cost_price: 12,
        min_stock: 2,
        active: true,
        category: { id: 'cat-1', name: 'Secos' },
      }, setEditingEditMock])

    const { default: ProdutosPageEdit } = await import('@/app/(dashboard)/produtos/page')
    renderToStaticMarkup(React.createElement(ProdutosPageEdit))
    await getDialogFormSubmitHandler()?.()

    const updateProductMutateAsync = useUpdateProductMock.mock.results[1]?.value.mutateAsync as ReturnType<typeof vi.fn>
    expect(updateProductMutateAsync).toHaveBeenCalledWith({
      id: 'prod-1',
      name: 'Farinha',
      sku: 'FR-1',
      category_id: 'cat-1',
      unit: 'kg',
      cost_price: 12,
      min_stock: 2,
    })
    expect(setOpenEditMock).toHaveBeenCalledWith(false)

    useCreateProductMock.mockReturnValueOnce({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Falha ao salvar produto')),
    })
    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [true, vi.fn()])
      .mockImplementationOnce(() => [null, vi.fn()])

    const { default: ProdutosPageError } = await import('@/app/(dashboard)/produtos/page')
    renderToStaticMarkup(React.createElement(ProdutosPageError))
    await getDialogFormSubmitHandler()?.()

    expect(formSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Falha ao salvar produto',
    })
  })
})
