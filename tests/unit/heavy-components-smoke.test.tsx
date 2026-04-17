import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useMenuItemsMock = vi.fn()
const useCreateOrderMock = vi.fn()
const useTablesMock = vi.fn()
const useTabsMock = vi.fn()
const useCreateTabMock = vi.fn()
const useUserMock = vi.fn()
const useOnboardingMock = vi.fn()
const useCompleteStepMock = vi.fn()
const invalidateQueriesMock = vi.fn()
const setQueryDataMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
    setQueryData: setQueryDataMock,
  }),
}))

vi.mock('react-hook-form', () => ({
  useForm: (options?: { defaultValues?: Record<string, unknown> }) => ({
    control: {},
    formState: { isSubmitting: false, errors: {} },
    handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => () =>
      callback(options?.defaultValues ?? {}),
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormControl: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormField: ({ render }: { render: (args: { field: Record<string, unknown> }) => React.ReactNode }) =>
    React.createElement(React.Fragment, null, render({ field: { value: '', onChange: vi.fn() } })),
  FormItem: ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
    React.createElement('div', { className }, children),
  FormLabel: ({ children }: React.PropsWithChildren) => React.createElement('label', null, children),
  FormMessage: () => React.createElement('span', null, 'form-message'),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-dialog': 'true' }, children),
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement('section', null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement('header', null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-select': 'true', ...props }, children),
  SelectContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectGroup: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectItem: ({ children, value }: React.PropsWithChildren<{ value: string }>) => React.createElement('div', { 'data-value': value }, children),
  SelectLabel: ({ children }: React.PropsWithChildren) => React.createElement('strong', null, children),
  SelectTrigger: ({ children }: React.PropsWithChildren) => React.createElement('button', null, children),
  SelectValue: ({ placeholder, children }: React.PropsWithChildren<{ placeholder?: string }>) =>
    React.createElement('span', null, children ?? placeholder),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: React.PropsWithChildren) => React.createElement('span', null, children),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Plus: Icon,
    Minus: Icon,
    Trash2: Icon,
    Check: Icon,
    ChefHat: Icon,
    Tag: Icon,
    Package: Icon,
    UtensilsCrossed: Icon,
    LayoutGrid: Icon,
  }
})

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useMenuItems: () => useMenuItemsMock(),
  useCreateOrder: () => useCreateOrderMock(),
}))

vi.mock('@/features/tables/hooks/useTables', () => ({
  useTables: () => useTablesMock(),
}))

vi.mock('@/features/tabs/hooks/useTabs', () => ({
  useTabs: (...args: unknown[]) => useTabsMock(...args),
  useCreateTab: () => useCreateTabMock(),
}))

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

vi.mock('@/features/onboarding/hooks/useOnboarding', () => ({
  useOnboarding: () => useOnboardingMock(),
  useCompleteStep: () => useCompleteStepMock(),
}))

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenElements(child))
  }

  if (!React.isValidElement(node)) {
    return []
  }

  if (typeof node.type === 'function') {
    return flattenElements(node.type(node.props))
  }

  return [node, ...flattenElements(node.props.children)]
}

function getTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => getTextContent(child)).join('')
  if (!React.isValidElement(node)) return ''
  return getTextContent(node.props.children)
}

describe('heavy components smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useMenuItemsMock.mockReturnValue({
      data: [
        {
          id: 'menu-1',
          name: 'Pizza Margherita',
          price: 32,
          available: true,
          category: { id: 'cat-1', name: 'Pizzas' },
        },
        {
          id: 'menu-2',
          name: 'Suco',
          price: 8,
          available: true,
          category: null,
        },
      ],
      isLoading: false,
    })
    useCreateOrderMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useTablesMock.mockReturnValue({
      data: [{ id: 'table-1', number: '10', capacity: 4, active_session: null }],
      isLoading: false,
    })
    useTabsMock.mockReturnValue({
      data: [{ id: 'tab-1', label: 'C-10', status: 'open' }],
      isLoading: false,
    })
    useCreateTabMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUserMock.mockReturnValue({
      user: {
        profile: {
          tenant_id: 'tenant-1',
        },
      },
    })
    useOnboardingMock.mockReturnValue({
      data: {
        has_category: false,
        has_product: false,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })
    useCompleteStepMock.mockReturnValue({
      mutateAsync: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza ManualOrderDialog no fluxo padrão', async () => {
    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    const markup = renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange: vi.fn(),
      })
    )

    expect(markup).toContain('Novo pedido manual')
    expect(markup).toContain('Itens do cardapio')
    expect(markup).toContain('Pizza Margherita')
    expect(markup).toContain('Pedido de balcao')
  }, 10000)

  it('renderiza ManualOrderDialog nos estados de carregamento e vazio', async () => {
    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    useMenuItemsMock.mockReturnValueOnce({
      data: [],
      isLoading: true,
    })

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange: vi.fn(),
      })
    )

    useMenuItemsMock.mockReturnValueOnce({
      data: [],
      isLoading: false,
    })

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange: vi.fn(),
      })
    )

    expect(loadingMarkup).toContain('Carregando itens...')
    expect(loadingMarkup).toContain('Resumo')
    expect(emptyMarkup).toContain('Nenhum item disponivel no cardapio.')
    expect(emptyMarkup).toContain('Adicione itens para montar o pedido.')
  })

  it('renderiza ManualOrderDialog com fluxo de comanda avulsa e resumo preenchido', async () => {
    let stateCall = 0

    vi.resetModules()
    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      return {
        ...actualReact,
        useMemo: <T,>(factory: () => T) => factory(),
        useState: (initialValue: unknown) => {
          stateCall += 1

          const valuesByCall = new Map<number, unknown>([
            [1, 'tab'],
            [2, ''],
            [3, 'tab-1'],
            [4, 'Balcao 3'],
            [5, 'Maria'],
            [6, '(11) 99999-9999'],
            [7, 'Sem cebola'],
            [8, [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 2 }]],
            [9, 'menu-1'],
            [10, 'Selecione um item do cardápio para adicionar.'],
          ])

          return [valuesByCall.get(stateCall) ?? initialValue, vi.fn()]
        },
      }
    })

    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    const markup = renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange: vi.fn(),
      })
    )

    expect(markup).toContain('Comanda avulsa')
    expect(markup).toContain('Use uma comanda existente ou crie uma nova')
    expect(markup).toContain('Selecione um item do cardápio para adicionar.')
    expect(markup).toContain('Vinculado a comanda C-10')
    expect(markup).toContain('R$ 64.00')
    expect(markup).toContain('Criar comanda')

    vi.doUnmock('react')
    vi.resetModules()
  })

  it('renderiza blocos extraídos do pedido manual', async () => {
    const { ManualOrderTabSection } = await import('@/features/orders/ManualOrderTabSection')
    const { ManualOrderContextSection } = await import('@/features/orders/ManualOrderContextSection')
    const { ManualOrderDialogContent } = await import('@/features/orders/ManualOrderDialogContent')
    const { ManualOrderCustomerFields } = await import('@/features/orders/ManualOrderCustomerFields')
    const { ManualOrderItemPicker } = await import('@/features/orders/ManualOrderItemPicker')
    const { ManualOrderSummary } = await import('@/features/orders/ManualOrderSummary')

    const contextMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderContextSection, {
        orderMode: 'tab',
        tables: [{ id: 'table-1', number: '10', capacity: 4, active_session: null }] as never,
        tablesLoading: false,
        selectedTableId: '',
        tabs: [{ id: 'tab-1', label: 'C-10', status: 'open' }] as never,
        tabsLoading: false,
        selectedTabId: 'tab-1',
        newTabLabel: 'Balcao 3',
        creatingTab: true,
        onOrderModeChange: vi.fn(),
        onTableChange: vi.fn(),
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
      })
    )

    const pickerMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderItemPicker, {
        availableItemsCount: 2,
        menuLoading: false,
        orderedGroups: [
          [
            'cat-1',
            {
              label: 'Pizzas',
              items: [{ id: 'menu-1', name: 'Pizza Margherita', price: 32, available: true }],
            },
          ],
        ] as never,
        selectedMenuItemId: 'menu-1',
        onSelectedMenuItemChange: vi.fn(),
        onAddItem: vi.fn(),
      })
    )

    const customerFieldsMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderCustomerFields, {
        customerName: 'Maria',
        customerPhone: '(11) 99999-9999',
        notes: 'Sem cebola',
        onCustomerNameChange: vi.fn(),
        onCustomerPhoneChange: vi.fn(),
        onNotesChange: vi.fn(),
      })
    )

    const tabMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderTabSection, {
        tabs: [{ id: 'tab-1', label: 'C-10', status: 'open' }] as never,
        tabsLoading: false,
        selectedTabId: 'tab-1',
        newTabLabel: 'Balcao 3',
        isCreating: true,
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
      })
    )

    const summaryMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderSummary, {
        summaryLabel: 'Vinculado a comanda C-10',
        cart: [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 2 }],
        total: 64,
        errorMessage: 'Selecione um item do cardápio para adicionar.',
        submitting: true,
        onChangeQuantity: vi.fn(),
        onRemoveItem: vi.fn(),
        onCancel: vi.fn(),
        onSubmit: vi.fn(),
      })
    )

    expect(contextMarkup).toContain('Tipo do pedido')
    expect(contextMarkup).toContain('Comanda avulsa')
    expect(customerFieldsMarkup).toContain('Cliente')
    expect(customerFieldsMarkup).toContain('Telefone')
    expect(customerFieldsMarkup).toContain('Observacoes')
    expect(customerFieldsMarkup).toContain('Sem cebola')
    expect(pickerMarkup).toContain('Itens do cardapio')
    expect(pickerMarkup).toContain('2 disponiveis')
    expect(pickerMarkup).toContain('Pizza Margherita')
    expect(tabMarkup).toContain('Comanda')
    expect(tabMarkup).toContain('C-10')
    expect(tabMarkup).toContain('Criando...')
    expect(summaryMarkup).toContain('Resumo')
    expect(summaryMarkup).toContain('Vinculado a comanda C-10')
    expect(summaryMarkup).toContain('Pizza Margherita')
    expect(summaryMarkup).toContain('R$ 64.00')
    expect(summaryMarkup).toContain('Selecione um item do cardápio para adicionar.')

    const dialogMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderDialogContent, {
        open: true,
        onOpenChange: vi.fn(),
        orderMode: 'counter',
        tables: [{ id: 'table-1', number: '10', capacity: 4, active_session: null }] as never,
        tablesLoading: false,
        selectedTableId: '',
        tabs: [{ id: 'tab-1', label: 'C-10', status: 'open' }] as never,
        tabsLoading: false,
        selectedTabId: '',
        newTabLabel: '',
        creatingTab: false,
        onOrderModeChange: vi.fn(),
        onTableChange: vi.fn(),
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
        customerName: 'Maria',
        customerPhone: '(11) 99999-9999',
        notes: 'Sem cebola',
        onCustomerNameChange: vi.fn(),
        onCustomerPhoneChange: vi.fn(),
        onNotesChange: vi.fn(),
        availableItemsCount: 1,
        menuLoading: false,
        orderedGroups: [
          [
            'cat-1',
            {
              label: 'Pizzas',
              items: [{ id: 'menu-1', name: 'Pizza Margherita', price: 32, available: true, category: null }],
            },
          ],
        ] as never,
        selectedMenuItemId: 'menu-1',
        onSelectedMenuItemChange: vi.fn(),
        onAddItem: vi.fn(),
        summaryLabel: 'Pedido de balcao',
        cart: [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 1 }],
        total: 32,
        errorMessage: '',
        submitting: false,
        onChangeQuantity: vi.fn(),
        onRemoveItem: vi.fn(),
        onCancel: vi.fn(),
        onSubmit: vi.fn(),
      })
    )

    expect(dialogMarkup).toContain('Novo pedido manual')
    expect(dialogMarkup).toContain('Pedido de balcao')
    expect(dialogMarkup).toContain('Pizza Margherita')
  })

  it('renderiza blocos extraídos do pedido manual em loading e vazio', async () => {
    const { ManualOrderContextSection } = await import('@/features/orders/ManualOrderContextSection')
    const { ManualOrderItemPicker } = await import('@/features/orders/ManualOrderItemPicker')
    const { ManualOrderTabSection } = await import('@/features/orders/ManualOrderTabSection')
    const { ManualOrderSummary } = await import('@/features/orders/ManualOrderSummary')

    const contextMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderContextSection, {
        orderMode: 'table',
        tables: [] as never,
        tablesLoading: true,
        selectedTableId: '',
        tabs: [] as never,
        tabsLoading: false,
        selectedTabId: '',
        newTabLabel: '',
        creatingTab: false,
        onOrderModeChange: vi.fn(),
        onTableChange: vi.fn(),
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
      })
    )

    const pickerLoadingMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderItemPicker, {
        availableItemsCount: 0,
        menuLoading: true,
        orderedGroups: [],
        selectedMenuItemId: '',
        onSelectedMenuItemChange: vi.fn(),
        onAddItem: vi.fn(),
      })
    )

    const pickerEmptyMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderItemPicker, {
        availableItemsCount: 0,
        menuLoading: false,
        orderedGroups: [],
        selectedMenuItemId: '',
        onSelectedMenuItemChange: vi.fn(),
        onAddItem: vi.fn(),
      })
    )

    const tabMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderTabSection, {
        tabs: [] as never,
        tabsLoading: true,
        selectedTabId: '',
        newTabLabel: '',
        isCreating: false,
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
      })
    )

    const summaryMarkup = renderToStaticMarkup(
      React.createElement(ManualOrderSummary, {
        summaryLabel: 'Pedido de balcao',
        cart: [],
        total: 0,
        errorMessage: '',
        submitting: false,
        onChangeQuantity: vi.fn(),
        onRemoveItem: vi.fn(),
        onCancel: vi.fn(),
        onSubmit: vi.fn(),
      })
    )

    expect(contextMarkup).toContain('Carregando mesas...')
    expect(pickerLoadingMarkup).toContain('Carregando itens...')
    expect(pickerEmptyMarkup).toContain('Nenhum item disponivel no cardapio.')
    expect(tabMarkup).toContain('Carregando comandas...')
    expect(tabMarkup).toContain('Criar comanda')
    expect(summaryMarkup).toContain('Pedido de balcao')
    expect(summaryMarkup).toContain('Adicione itens para montar o pedido.')
    expect(summaryMarkup).toContain('0 itens')
    expect(summaryMarkup).toContain('Criar pedido')
  })

  it('aciona ações dos blocos extraídos do pedido manual', async () => {
    const { ManualOrderContextSection } = await import('@/features/orders/ManualOrderContextSection')
    const { ManualOrderCustomerFields } = await import('@/features/orders/ManualOrderCustomerFields')
    const { ManualOrderItemPicker } = await import('@/features/orders/ManualOrderItemPicker')
    const { ManualOrderTabSection } = await import('@/features/orders/ManualOrderTabSection')
    const { ManualOrderSummary } = await import('@/features/orders/ManualOrderSummary')

    const onOrderModeChange = vi.fn()
    const onSelectTab = vi.fn()
    const onNewTabLabelChange = vi.fn()
    const onCreateTab = vi.fn()
    const onCustomerNameChange = vi.fn()
    const onCustomerPhoneChange = vi.fn()
    const onNotesChange = vi.fn()
    const onAddItem = vi.fn()
    const onChangeQuantity = vi.fn()
    const onRemoveItem = vi.fn()
    const onCancel = vi.fn()
    const onSubmit = vi.fn()

    const contextElements = flattenElements(
      React.createElement(ManualOrderContextSection, {
        orderMode: 'table',
        tables: [{ id: 'table-1', number: '10', capacity: 4, active_session: {} }] as never,
        tablesLoading: false,
        selectedTableId: 'table-1',
        tabs: [] as never,
        tabsLoading: false,
        selectedTabId: '',
        newTabLabel: '',
        creatingTab: false,
        onOrderModeChange,
        onTableChange: vi.fn(),
        onSelectTab,
        onNewTabLabelChange,
        onCreateTab,
      })
    )

    const pickerElements = flattenElements(
      React.createElement(ManualOrderItemPicker, {
        availableItemsCount: 1,
        menuLoading: false,
        orderedGroups: [
          [
            'cat-1',
            {
              label: 'Pizzas',
              items: [{ id: 'menu-1', name: 'Pizza Margherita', price: 32, available: true }],
            },
          ],
        ] as never,
        selectedMenuItemId: 'menu-1',
        onSelectedMenuItemChange: vi.fn(),
        onAddItem,
      })
    )

    const customerFieldsElements = flattenElements(
      React.createElement(ManualOrderCustomerFields, {
        customerName: '',
        customerPhone: '',
        notes: '',
        onCustomerNameChange,
        onCustomerPhoneChange,
        onNotesChange,
      })
    )

    const pickerButton = pickerElements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Adicionar')
    )
    const customerInputs = customerFieldsElements.filter((element) => element.type === 'input')
    const customerTextarea = customerFieldsElements.find((element) => element.type === 'textarea')

    expect(getTextContent(contextElements)).toContain('Mesa 10')
    expect(getTextContent(contextElements)).toContain('comanda aberta')
    contextElements.find((element) => element.props['data-select'] === 'true')?.props.onValueChange('counter')
    customerInputs[0].props.onChange({ target: { value: 'Maria' } })
    customerInputs[1].props.onChange({ target: { value: '(11) 99999-9999' } })
    customerTextarea?.props.onChange({ target: { value: 'Sem cebola' } })
    expect(getTextContent(pickerElements)).toContain('Pizza Margherita')
    pickerButton?.props.onClick()

    expect(onOrderModeChange).toHaveBeenCalledWith('counter')
    expect(onCustomerNameChange).toHaveBeenCalledWith('Maria')
    expect(onCustomerPhoneChange).toHaveBeenCalledWith('(11) 99999-9999')
    expect(onNotesChange).toHaveBeenCalledWith('Sem cebola')
    expect(onAddItem).toHaveBeenCalledOnce()

    const tabElements = flattenElements(
      React.createElement(ManualOrderTabSection, {
        tabs: [{ id: 'tab-1', label: 'C-10', status: 'open' }] as never,
        tabsLoading: false,
        selectedTabId: 'tab-1',
        newTabLabel: 'Balcao 3',
        isCreating: false,
        onSelectTab,
        onNewTabLabelChange,
        onCreateTab,
      })
    )

    const tabInput = tabElements.find((element) => element.type === 'input')
    const tabButton = tabElements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Criar comanda')
    )

    tabInput?.props.onChange({ target: { value: 'Nova comanda 7' } })
    tabButton?.props.onClick()

    expect(onNewTabLabelChange).toHaveBeenCalledWith('Nova comanda 7')
    expect(onCreateTab).toHaveBeenCalledOnce()

    const summaryElements = flattenElements(
      React.createElement(ManualOrderSummary, {
        summaryLabel: 'Vinculado a comanda C-10',
        cart: [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 2 }],
        total: 64,
        errorMessage: '',
        submitting: false,
        onChangeQuantity,
        onRemoveItem,
        onCancel,
        onSubmit,
      })
    )

    const summaryButtons = summaryElements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )

    summaryButtons[0].props.onClick()
    summaryButtons[1].props.onClick()
    summaryButtons[2].props.onClick()
    summaryButtons[3].props.onClick()
    summaryButtons[4].props.onClick()

    expect(onRemoveItem).toHaveBeenCalledWith('menu-1')
    expect(onChangeQuantity).toHaveBeenNthCalledWith(1, 'menu-1', -1)
    expect(onChangeQuantity).toHaveBeenNthCalledWith(2, 'menu-1', 1)
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('renderiza contexto do pedido manual em modo balcão sem blocos extras', async () => {
    const { ManualOrderContextSection } = await import('@/features/orders/ManualOrderContextSection')

    const markup = renderToStaticMarkup(
      React.createElement(ManualOrderContextSection, {
        orderMode: 'counter',
        tables: [] as never,
        tablesLoading: false,
        selectedTableId: '',
        tabs: [] as never,
        tabsLoading: false,
        selectedTabId: '',
        newTabLabel: '',
        creatingTab: false,
        onOrderModeChange: vi.fn(),
        onTableChange: vi.fn(),
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
      })
    )

    expect(markup).toContain('Tipo do pedido')
    expect(markup).toContain('Balcao / caixa')
    expect(markup).not.toContain('Carregando mesas...')
    expect(markup).not.toContain('Selecione a mesa')
    expect(markup).not.toContain('Use uma comanda existente ou crie uma nova sem sair desta tela.')
  })

  it('renderiza mesa sem comanda aberta no contexto do pedido manual', async () => {
    const { ManualOrderContextSection } = await import('@/features/orders/ManualOrderContextSection')

    const markup = renderToStaticMarkup(
      React.createElement(ManualOrderContextSection, {
        orderMode: 'table',
        tables: [{ id: 'table-1', number: '10', capacity: 4, active_session: null }] as never,
        tablesLoading: false,
        selectedTableId: 'table-1',
        tabs: [] as never,
        tabsLoading: false,
        selectedTabId: '',
        newTabLabel: '',
        creatingTab: false,
        onOrderModeChange: vi.fn(),
        onTableChange: vi.fn(),
        onSelectTab: vi.fn(),
        onNewTabLabelChange: vi.fn(),
        onCreateTab: vi.fn(),
      })
    )

    expect(markup).toContain('Mesa 10')
    expect(markup).toContain('abrir comanda')
  })

  it('renderiza MenuItemDialog com ficha técnica e extras', async () => {
    const { useForm } = await import('react-hook-form')
    const { MenuItemDialog } = await import('@/features/menu/MenuItemDialog')

    const form = useForm({
      defaultValues: {
        name: 'Pizza Margherita',
        description: 'Clássica',
        price: 32,
        category_id: 'cat-1',
        display_order: 1,
      },
    })

    const markup = renderToStaticMarkup(
      React.createElement(MenuItemDialog, {
        open: true,
        onOpenChange: vi.fn(),
        editing: { id: 'item-1' },
        form,
        categories: [{ id: 'cat-1', name: 'Pizzas' }],
        hasStockAutomation: true,
        linkedProductId: 'prod-1',
        onLinkedProductChange: vi.fn(),
        products: { data: [{ id: 'prod-1', name: 'Massa', unit: 'un' }] },
        ingredients: [{ product_id: 'prod-1', quantity: 1 }],
        onAddIngredient: vi.fn(),
        onUpdateIngredient: vi.fn(),
        onRemoveIngredient: vi.fn(),
        allExtras: [
          { id: 'extra-1', name: 'Catupiry', price: 5, category: 'border' },
          { id: 'extra-2', name: 'Calabresa', price: 7, category: 'flavor' },
          { id: 'extra-3', name: 'Molho da casa', price: 2, category: 'other' },
        ],
        selectedExtras: ['extra-1'],
        onSelectedExtrasChange: vi.fn(),
        onSubmit: vi.fn(),
      })
    )

    expect(markup).toContain('Editar item')
    expect(markup).toContain('Produto base para baixa simples')
    expect(markup).toContain('Ficha técnica')
    expect(markup).toContain('grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]')
    expect(markup).toContain('bordas são aplicadas automaticamente')
    expect(markup).toContain('Itens adicionais')
    expect(markup).toContain('Calabresa')
    expect(markup).toContain('Molho da casa')
  })

  it('aciona handlers básicos do MenuItemDialog', async () => {
    const { useForm } = await import('react-hook-form')
    const { MenuItemDialog } = await import('@/features/menu/MenuItemDialog')

    const onOpenChange = vi.fn()
    const onAddIngredient = vi.fn()
    const onUpdateIngredient = vi.fn()
    const onRemoveIngredient = vi.fn()
    const onSelectedExtrasChange = vi.fn()
    const onSubmit = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuItemDialog, {
        open: true,
        onOpenChange,
        editing: null,
        form: useForm({
          defaultValues: {
            name: '',
            description: '',
            price: 0,
            category_id: '',
            display_order: 0,
          },
        }),
        categories: [],
        hasStockAutomation: true,
        linkedProductId: 'none',
        onLinkedProductChange: vi.fn(),
        products: { data: [{ id: 'prod-1', name: 'Queijo', unit: 'kg' }] },
        ingredients: [{ product_id: 'prod-1', quantity: 2 }],
        onAddIngredient,
        onUpdateIngredient,
        onRemoveIngredient,
        allExtras: [{ id: 'extra-1', name: 'Molho', price: 0, category: 'Extras' }],
        selectedExtras: [],
        onSelectedExtrasChange,
        onSubmit,
      })
    )

    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )
    const ingredientSelect = elements.find(
      (element) =>
        element.props['data-select'] === 'true' &&
        element.props.value === 'prod-1' &&
        typeof element.props.onValueChange === 'function',
    )
    const extraCheckbox = elements.find((element) => element.type === 'input' && element.props.type === 'checkbox')
    const ingredientQuantityInput = elements.find(
      (element) => element.type === 'input' && element.props.type === 'number' && element.props.step === '0.001',
    )
    const formElement = elements.find((element) => element.type === 'form')

    expect(getTextContent(elements)).toContain('Novo item do cardápio')

    buttons.find((element) => getTextContent(element).includes('Adicionar insumo'))?.props.onClick()
    buttons.find((element) => getTextContent(element).includes('Cancelar'))?.props.onClick()
    buttons.find((element) => element.props.variant === 'ghost')?.props.onClick()
    ingredientSelect?.props.onValueChange('prod-2')
    ingredientQuantityInput?.props.onChange({ target: { value: '3.5' } })
    ingredientQuantityInput?.props.onChange({ target: { value: '' } })
    extraCheckbox?.props.onChange({ target: { checked: true } })
    await formElement?.props.onSubmit({ preventDefault: vi.fn() })

    expect(onAddIngredient).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onRemoveIngredient).toHaveBeenCalledWith(0)
    expect(onUpdateIngredient).toHaveBeenCalledWith(0, { product_id: 'prod-2' })
    expect(onUpdateIngredient).toHaveBeenCalledWith(0, { quantity: 3.5 })
    expect(onUpdateIngredient).toHaveBeenCalledWith(0, { quantity: 0 })
    expect(onSelectedExtrasChange).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('cobre MenuItemDialog sem automação, com erro root e update de quantidade/extras', async () => {
    const { MenuItemDialog } = await import('@/features/menu/MenuItemDialog')

    const onOpenChange = vi.fn()
    const onUpdateIngredient = vi.fn()
    const onSelectedExtrasChange = vi.fn()

    const form = {
      control: {},
      formState: {
        isSubmitting: true,
        errors: {
          root: { message: 'Erro ao salvar item.' },
        },
      },
      handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => () =>
        callback({
          name: 'Pizza',
          description: 'Especial',
          price: 42,
          category_id: 'cat-1',
          display_order: 4,
        }),
    }

    const elements = flattenElements(
      React.createElement(MenuItemDialog, {
        open: true,
        onOpenChange,
        editing: { id: 'item-1' },
        form,
        categories: [{ id: 'cat-1', name: 'Pizzas' }],
        hasStockAutomation: false,
        linkedProductId: 'none',
        onLinkedProductChange: vi.fn(),
        products: { data: [{ id: 'prod-1', name: 'Queijo', unit: 'kg' }] },
        ingredients: [{ product_id: 'prod-1', quantity: 2 }],
        onAddIngredient: vi.fn(),
        onUpdateIngredient,
        onRemoveIngredient: vi.fn(),
        allExtras: [{ id: 'extra-1', name: 'Molho', price: 0, category: 'Extras' }],
        selectedExtras: ['extra-1'],
        onSelectedExtrasChange,
        onSubmit: vi.fn(),
      }),
    )

    expect(getTextContent(elements)).toContain('Editar item')
    expect(getTextContent(elements)).toContain('Baixa automática de estoque')
    expect(getTextContent(elements)).toContain('disponível apenas nos planos pagos')
    expect(getTextContent(elements)).toContain('Erro ao salvar item.')
    expect(getTextContent(elements)).toContain('Salvando...')

    const extraCheckbox = elements.find((element) => element.type === 'input' && element.props.type === 'checkbox')
    extraCheckbox?.props.onChange({ target: { checked: false } })

    expect(onSelectedExtrasChange).toHaveBeenCalledOnce()
    const toggleUpdater = onSelectedExtrasChange.mock.calls[0]?.[0] as (prev: string[]) => string[]
    expect(toggleUpdater(['extra-1'])).toEqual([])

    const quantityInput = elements.find(
      (element) => element.type === 'input' && element.props.type === 'number' && element.props.step === '0.01',
    )
    quantityInput?.props.onChange({ target: { value: '44' } })

    const cancelButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Cancelar'),
    )
    cancelButton?.props.onClick()

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onUpdateIngredient).not.toHaveBeenCalled()
  })

  it('renderiza OnboardingWizard com progresso e passos', async () => {
    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')

    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('Configure o ChefOps')
    expect(markup).toContain('0 de 4 passos concluídos')
    expect(markup).toContain('Crie sua primeira categoria')
    expect(markup).toContain('Criar')
  })

  it('OnboardingWizard retorna vazio quando já completado', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: true,
        has_table: true,
        completed_at: '2026-03-21T00:00:00Z',
      },
      isLoading: false,
    })

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')

    expect(renderToStaticMarkup(React.createElement(OnboardingWizard))).toBe('')
  })

  it('OnboardingWizard retorna vazio durante loading', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: null,
      isLoading: true,
    })

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')

    expect(renderToStaticMarkup(React.createElement(OnboardingWizard))).toBe('')
  })

  it('renderiza OnboardingWizard com progresso parcial e etapa de item do cardápio ativa', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('2 de 4 passos concluídos')
    expect(markup).toContain('50%')
    expect(markup).toContain('Adicione um item ao cardápio')
    expect(markup).toContain('Pizza Margherita')
  })

  it('renderiza OnboardingWizard com etapa final de mesas ativa', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: true,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('3 de 4 passos concluídos')
    expect(markup).toContain('75%')
    expect(markup).toContain('Cadastre uma mesa (opcional)')
    expect(markup).toContain('Varanda')
    expect(markup).toContain('Não se aplica ao meu estabelecimento')
  })

  it('submete etapa ativa do onboarding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const elements = flattenElements(React.createElement(OnboardingWizard))
    const formElement = elements.find((element) => element.type === 'form')

    await formElement?.props.onSubmit({ preventDefault: vi.fn() })

    expect(fetch).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', display_order: 0 }),
    })
  })

  it('submete etapa de produto do onboarding', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: {
        has_category: true,
        has_product: false,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const elements = flattenElements(React.createElement(OnboardingWizard))
    const formElement = elements.find((element) => element.type === 'form')

    await formElement?.props.onSubmit({ preventDefault: vi.fn() })

    expect(fetch).toHaveBeenCalledWith('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', unit: 'un', cost_price: 0, min_stock: 0 }),
    })
  })

  it('submete etapa de item do cardápio do onboarding', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const elements = flattenElements(React.createElement(OnboardingWizard))
    const formElement = elements.find((element) => element.type === 'form')

    await formElement?.props.onSubmit({ preventDefault: vi.fn() })

    expect(fetch).toHaveBeenCalledWith('/api/menu-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', price: 0 }),
    })
  })

  it('submete etapa de mesa do onboarding', async () => {
    useOnboardingMock.mockReturnValueOnce({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: true,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const elements = flattenElements(React.createElement(OnboardingWizard))
    const formElement = elements.find((element) => element.type === 'form')

    await formElement?.props.onSubmit({ preventDefault: vi.fn() })

    expect(fetch).toHaveBeenCalledWith('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: '', capacity: 4 }),
    })
  })
})
