import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useMenuItemsMock = vi.fn()
const useCreateOrderMock = vi.fn()
const useTablesMock = vi.fn()
const useTabsMock = vi.fn()
const useCreateTabMock = vi.fn()
const useUserMock = vi.fn()
const createOrderMutateAsyncMock = vi.fn()
const createTabMutateAsyncMock = vi.fn()

let capturedContentProps: Record<string, unknown> | null = null
let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
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
  useTabs: (...args: Parameters<typeof useTabsMock>) => useTabsMock(...args),
  useCreateTab: () => useCreateTabMock(),
}))

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

vi.mock('@/features/orders/ManualOrderDialogContent', () => ({
  ManualOrderDialogContent: (props: Record<string, unknown>) => {
    capturedContentProps = props
    return React.createElement('div', null, 'Manual Order Dialog Content Mock')
  },
}))

describe('ManualOrderDialog component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedContentProps = null
    stateValues = []
    stateSetters = []

    useStateMock.mockImplementation((initial: unknown) => {
      const setter = vi.fn()
      const index = stateSetters.length
      stateSetters.push(setter)
      return [index in stateValues ? stateValues[index] : initial, setter]
    })

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
    useTablesMock.mockReturnValue({
      data: [{ id: 'table-1', number: '10', capacity: 4, active_session: null }],
      isLoading: false,
    })
    useTabsMock.mockReturnValue({
      data: [{ id: 'tab-1', label: 'C-10', status: 'open' }],
      isLoading: false,
    })
    useUserMock.mockReturnValue({
      user: {
        profile: {
          tenant_id: 'tenant-1',
        },
      },
    })

    createOrderMutateAsyncMock.mockResolvedValue({
      id: 'order-1',
      order_number: 99,
      status: 'pending',
      payment_status: 'pending',
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
    })
    createTabMutateAsyncMock.mockResolvedValue({ id: 'tab-created' })

    useCreateOrderMock.mockReturnValue({
      isPending: false,
      mutateAsync: createOrderMutateAsyncMock,
    })
    useCreateTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: createTabMutateAsyncMock,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais', async () => {
    const onOpenChange = vi.fn()

    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    expect(
      renderToStaticMarkup(
        React.createElement(ManualOrderDialog, {
          open: true,
          onOpenChange,
        }),
      ),
    ).toContain('Manual Order Dialog Content Mock')

    expect(capturedContentProps).toBeTruthy()

    const props = capturedContentProps as {
      availableItemsCount: number
      summaryLabel: string
      onOpenChange: (open: boolean) => void
      onOrderModeChange: (value: 'counter' | 'table' | 'tab') => void
      onTableChange: (value: string) => void
      onSelectTab: (value: string) => void
      onNewTabLabelChange: (value: string) => void
      onCustomerNameChange: (value: string) => void
      onCustomerPhoneChange: (value: string) => void
      onNotesChange: (value: string) => void
      onSelectedMenuItemChange: (value: string) => void
      onChangeQuantity: (menuItemId: string, delta: number) => void
      onRemoveItem: (menuItemId: string) => void
      onCancel: () => void
    }

    expect(props.availableItemsCount).toBe(2)
    expect(props.summaryLabel).toBe('Pedido de balcao')

    props.onOrderModeChange('table')
    props.onTableChange('table-1')
    props.onSelectTab('tab-1')
    props.onNewTabLabelChange('Balcao 7')
    props.onCustomerNameChange('Maria')
    props.onCustomerPhoneChange('(11) 99999-9999')
    props.onNotesChange('Sem cebola')
    props.onSelectedMenuItemChange('menu-1')
    props.onChangeQuantity('menu-1', 1)
    props.onRemoveItem('menu-1')
    props.onOpenChange(false)
    props.onCancel()

    expect(stateSetters[0]).toHaveBeenCalledWith('table')
    expect(stateSetters[1]).toHaveBeenCalledWith('')
    expect(stateSetters[2]).toHaveBeenCalledWith('')
    expect(stateSetters[1]).toHaveBeenCalledWith('table-1')
    expect(stateSetters[2]).toHaveBeenCalledWith('tab-1')
    expect(stateSetters[3]).toHaveBeenCalledWith('Balcao 7')
    expect(stateSetters[4]).toHaveBeenCalledWith('Maria')
    expect(stateSetters[5]).toHaveBeenCalledWith('(11) 99999-9999')
    expect(stateSetters[6]).toHaveBeenCalledWith('Sem cebola')
    expect(stateSetters[8]).toHaveBeenCalledWith('menu-1')
    expect(stateSetters[7]).toHaveBeenCalledTimes(4)
    expect(onOpenChange).toHaveBeenCalledTimes(2)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(stateSetters[0]).toHaveBeenLastCalledWith('counter')
    expect(stateSetters[1]).toHaveBeenLastCalledWith('')
    expect(stateSetters[2]).toHaveBeenLastCalledWith('')
    expect(stateSetters[3]).toHaveBeenLastCalledWith('')
    expect(stateSetters[4]).toHaveBeenLastCalledWith('')
    expect(stateSetters[5]).toHaveBeenLastCalledWith('')
    expect(stateSetters[6]).toHaveBeenLastCalledWith('')
    expect(stateSetters[7]).toHaveBeenLastCalledWith([])
    expect(stateSetters[8]).toHaveBeenLastCalledWith('')
    expect(stateSetters[9]).toHaveBeenLastCalledWith('')
  })

  it('cria comanda, adiciona item e envia pedido com sucesso', async () => {
    stateValues[0] = 'tab'
    stateValues[2] = 'tab-1'
    stateValues[3] = 'C-10'
    stateValues[4] = 'Maria'
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Sem cebola'
    stateValues[7] = [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 1 }]
    stateValues[8] = 'menu-2'

    const onOpenChange = vi.fn()
    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange,
      }),
    )

    const props = capturedContentProps as {
      onCreateTab: () => Promise<void>
      onAddItem: () => void
      onSubmit: () => Promise<void>
    }

    await props.onCreateTab()
    props.onAddItem()
    await props.onSubmit()

    expect(createTabMutateAsyncMock).toHaveBeenCalledWith({ label: 'C-10' })
    expect(stateSetters[2]).toHaveBeenCalledWith('tab-created')
    expect(stateSetters[3]).toHaveBeenCalledWith('')
    expect(stateSetters[9]).toHaveBeenCalledWith('')
    expect(stateSetters[7]).toHaveBeenCalledWith([
      { menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 1 },
      { menu_item_id: 'menu-2', name: 'Suco', price: 8, quantity: 1 },
    ])
    expect(stateSetters[8]).toHaveBeenCalledWith('')
    expect(createOrderMutateAsyncMock).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      customer_name: 'Maria',
      customer_phone: '11999999999',
      table_id: undefined,
      table_number: undefined,
      tab_id: 'tab-1',
      payment_method: 'counter',
      notes: 'Sem cebola',
      items: [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 1 }],
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('propaga validações de criação, adição e submit', async () => {
    stateValues[0] = 'table'

    const onOpenChange = vi.fn()

    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange,
      }),
    )

    const props = capturedContentProps as {
      onCreateTab: () => Promise<void>
      onAddItem: () => void
      onSubmit: () => Promise<void>
    }

    await props.onCreateTab()
    props.onAddItem()
    await props.onSubmit()

    expect(stateSetters[9]).toHaveBeenCalledWith('Informe um identificador para criar a comanda.')
    expect(stateSetters[9]).toHaveBeenCalledWith('Selecione um item do cardápio para adicionar.')
    expect(stateSetters[9]).toHaveBeenCalledWith('Adicione ao menos um item ao pedido.')
  })

  it('propaga erros assíncronos de criação de comanda e submit', async () => {
    stateValues[0] = 'tab'
    stateValues[2] = 'tab-1'
    stateValues[3] = 'C-20'
    stateValues[7] = [{ menu_item_id: 'menu-1', name: 'Pizza Margherita', price: 32, quantity: 1 }]

    const onOpenChange = vi.fn()
    createTabMutateAsyncMock.mockRejectedValueOnce(new Error('Falha ao criar comanda'))
    createOrderMutateAsyncMock.mockRejectedValueOnce(new Error('Falha ao criar pedido'))

    const { default: ManualOrderDialog } = await import('@/features/orders/components/ManualOrderDialog')

    renderToStaticMarkup(
      React.createElement(ManualOrderDialog, {
        open: true,
        onOpenChange,
      }),
    )

    const retryProps = capturedContentProps as {
      onCreateTab: () => Promise<void>
      onSubmit: () => Promise<void>
    }

    await retryProps.onCreateTab()
    await retryProps.onSubmit()

    expect(stateSetters[9]).toHaveBeenCalledWith('Falha ao criar comanda')
    expect(stateSetters[9]).toHaveBeenCalledWith('Falha ao criar pedido')
  })
})
