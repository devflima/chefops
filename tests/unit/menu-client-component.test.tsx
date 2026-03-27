import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const createOrderMutateAsyncMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessCalls: Array<{ title: string; options?: Record<string, unknown> }> = []
const effectCleanups: Array<() => void> = []

let capturedShellProps: Record<string, unknown> | null = null
let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
    useEffect: (effect: () => void | (() => void)) => {
      const cleanup = effect()
      if (typeof cleanup === 'function') effectCleanups.push(cleanup)
    },
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: (...args: Parameters<typeof toastSuccessMock>) => {
      toastSuccessMock(...args)
      toastSuccessCalls.push({
        title: args[0] as string,
        options: args[1] as Record<string, unknown> | undefined,
      })
    },
    error: (...args: Parameters<typeof toastErrorMock>) => {
      toastErrorMock(...args)
    },
  },
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useCreateOrder: () => ({
    isPending: false,
    mutateAsync: createOrderMutateAsyncMock,
  }),
  useCreatePublicOrder: () => ({
    isPending: false,
    mutateAsync: createOrderMutateAsyncMock,
  }),
}))

vi.mock('@/features/menu/PublicMenuPageShell', () => ({
  PublicMenuPageShell: (props: Record<string, unknown>) => {
    capturedShellProps = props
    return React.createElement('div', null, 'Public Menu Page Shell Mock')
  },
}))

function createMenuItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-1',
    tenant_id: 'tenant-1',
    category_id: 'cat-1',
    name: 'Pizza Margherita',
    description: 'Clássica',
    price: 32,
    available: true,
    display_order: 1,
    category: { id: 'cat-1', name: 'Pizzas' },
    extras: [{ extra: { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' } }],
    ...overrides,
  }
}

function createPublicOrderStatus(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    order_number: 42,
    status: 'pending',
    payment_status: 'pending',
    created_at: '2026-03-22T00:00:00.000Z',
    updated_at: '2026-03-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('MenuClient component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedShellProps = null
    stateValues = []
    stateSetters = []
    toastSuccessCalls.length = 0
    toastErrorMock.mockReset()
    effectCleanups.length = 0

    useStateMock.mockImplementation((initial: unknown) => {
      const setter = vi.fn()
      const index = stateSetters.length
      stateSetters.push(setter)
      return [index in stateValues ? stateValues[index] : initial, setter]
    })

    createOrderMutateAsyncMock.mockResolvedValue({
      id: 'order-created',
      order_number: 77,
      status: 'pending',
      payment_status: 'pending',
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
    })

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.startsWith('/api/customers?')) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              id: 'customer-1',
              name: 'Maria',
              phone: '11999999999',
              addresses: [
                {
                  zip_code: '12345-678',
                  street: 'Rua A',
                  number: '10',
                  city: 'São Paulo',
                  is_default: true,
                },
              ],
            },
          }),
        }
      }

      if (url === '/api/customers') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { id: 'customer-created' } }),
        }
      }

      if (url === '/api/cep/12345678') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              zip_code: '12345-678',
              street: 'Rua B',
              city: 'São Paulo',
            },
          }),
        }
      }

      if (url === '/api/public/checkout/session-1') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              status: 'converted',
              created_order_id: 'order-converted',
              order_number: 88,
              order_status: 'confirmed',
              payment_status: 'paid',
            },
          }),
        }
      }

      if (url === '/api/public/orders/order-pending/status') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: createPublicOrderStatus({ id: 'order-pending', status: 'confirmed' }),
          }),
        }
      }

      if (url === '/api/public/checkout/mercado-pago') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: { init_point: 'https://mp.test/checkout' },
          }),
        }
      }

      if (url === '/api/public/orders/order-1/cancel') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: createPublicOrderStatus({
              id: 'order-1',
              status: 'cancelled',
              payment_status: 'refunded',
            }),
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(() => 'Cliente desistiu'),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais do shell', async () => {
    stateValues[3] = { item: createMenuItem() }
    stateValues[4] = {
      'item-1': { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' },
    }

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    expect(
      renderToStaticMarkup(
        React.createElement(MenuClient, {
          tenant: {
            id: 'tenant-1',
            name: 'Pizzaria ChefOps',
            slug: 'chefops',
            plan: 'basic',
            delivery_settings: { delivery_enabled: true, flat_fee: 8 },
          },
          items: [
            createMenuItem(),
            createMenuItem({ id: 'item-2', name: 'Calabresa', price: 35 }),
          ],
          tableInfo: { id: 'table-1', number: '12' },
          checkoutSessionId: null,
          checkoutResult: null,
        }),
      ),
    ).toContain('Public Menu Page Shell Mock')

    expect(capturedShellProps).toBeTruthy()

    const props = capturedShellProps as {
      cartCount: number
      onCartOpen: () => void
      onTrackOrder: () => void
      onCategoryChange: (value: string | null) => void
      onAdd: (item: ReturnType<typeof createMenuItem>, halfFlavor?: ReturnType<typeof createMenuItem>) => void
      onBorderToggle: (item: ReturnType<typeof createMenuItem>, border: { id: string; name: string; price: number; category: string } | null) => void
      onHalfFlavor: (item: ReturnType<typeof createMenuItem>) => void
      onCloseHalfFlavor: () => void
      onSelectHalfFlavor: (item: ReturnType<typeof createMenuItem>) => void
      drawerProps: {
        onClose: () => void
        onStepChange: (step: 'cart' | 'info' | 'address' | 'done') => void
        infoStepProps: {
          onPhoneChange: (value: string) => void
          onCustomerCpfChange: (value: string) => void
        }
      }
    }

    expect(props.cartCount).toBe(0)

    props.onCartOpen()
    props.onTrackOrder()
    props.onCategoryChange('cat-1')
    props.onBorderToggle(createMenuItem(), { id: 'border-2', name: 'Cheddar', price: 6, category: 'border' })
    props.onHalfFlavor(createMenuItem())
    props.onCloseHalfFlavor()
    props.onAdd(createMenuItem())
    props.onSelectHalfFlavor(createMenuItem({ id: 'item-2', name: 'Calabresa', price: 35 }))
    props.drawerProps.onClose()
    props.drawerProps.onStepChange('address')
    props.drawerProps.infoStepProps.onPhoneChange('11999999999')
    props.drawerProps.infoStepProps.onCustomerCpfChange('12345678909')

    expect(stateSetters[1]).toHaveBeenCalledWith(true)
    expect(stateSetters[1]).toHaveBeenCalledWith(false)
    expect(stateSetters[2]).toHaveBeenCalledWith('cart')
    expect(stateSetters[2]).toHaveBeenCalledWith('done')
    expect(stateSetters[2]).toHaveBeenCalledWith('address')
    expect(stateSetters[3]).toHaveBeenCalledWith({ item: createMenuItem() })
    expect(stateSetters[3]).toHaveBeenCalledWith(null)
    expect(stateSetters[4]).toHaveBeenCalledTimes(3)
    expect(stateSetters[5]).toHaveBeenCalledWith('(11) 99999-9999')
    expect(stateSetters[10]).toHaveBeenCalledWith(false)
    expect(stateSetters[8]).toHaveBeenCalledWith(null)
    expect(stateSetters[11]).toHaveBeenCalledWith(false)
    expect(stateSetters[6]).toHaveBeenCalledWith('')
    expect(stateSetters[7]).toHaveBeenCalledWith('123.456.789-09')
    expect(stateSetters[0]).toHaveBeenCalledTimes(2)
    expect(toastSuccessMock).toHaveBeenCalledTimes(2)
  })

  it('não pré-seleciona pagamento no fluxo público sem mesa', async () => {
    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          paymentMethod: string
        }
      }
    }

    expect(props.drawerProps.infoStepProps.paymentMethod).toBe('')
  })

  it('mostra toast quando campos obrigatórios impedem o avanço no checkout público', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = ''
    stateValues[6] = ''
    stateValues[14] = ''

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onContinue()

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Confira os campos obrigatórios: Nome obrigatório, Telefone inválido, Selecione uma forma de pagamento'
    )
    expect(createOrderMutateAsyncMock).not.toHaveBeenCalled()
  })

  it('executa lookup, CEP, submit do pedido e cancelamento', async () => {
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[7] = '123.456.789-09'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[15] = 'Sem cebola'
    stateValues[17] = 'order-1'
    stateValues[22] = createPublicOrderStatus()
    stateValues[25] = '123456'

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: { id: 'table-1', number: '12' },
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
          onVerifyPhoneCode: () => Promise<void>
          onContinue: () => Promise<void>
        }
        addressStepProps: {
          onCepLookup: (value: string) => Promise<void>
        }
        doneStepProps: {
          onCancelOrder: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()
    await props.drawerProps.addressStepProps.onCepLookup('12345-678')
    await props.drawerProps.infoStepProps.onContinue()
    await props.drawerProps.doneStepProps.onCancelOrder()

    expect(fetch).not.toHaveBeenCalledWith('/api/public/phone-verification/send', expect.anything())
    expect(fetch).not.toHaveBeenCalledWith('/api/public/phone-verification/verify', expect.anything())
    expect(fetch).not.toHaveBeenCalledWith('/api/customers?phone=11999999999&tenant_id=tenant-1')
    expect(fetch).toHaveBeenCalledWith('/api/cep/12345678')
    expect(fetch).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant-1',
        name: 'Maria',
        phone: '11999999999',
        cpf: '123.456.789-09',
        address: undefined,
      }),
    })
    expect(createOrderMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-1',
        customer_name: 'Maria',
        customer_id: 'customer-created',
        payment_method: 'table',
      }),
    )
    expect(fetch).toHaveBeenCalledWith('/api/public/orders/order-1/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelled_reason: 'Cliente desistiu' }),
    })
    expect(stateSetters[13]).toHaveBeenCalledWith(true)
    expect(stateSetters[13]).toHaveBeenCalledWith(false)
    expect(stateSetters[17]).toHaveBeenCalledWith('order-created')
    expect(stateSetters[16]).toHaveBeenCalledWith(77)
    expect(stateSetters[22]).toHaveBeenCalled()
    expect(stateSetters[2]).toHaveBeenCalledWith('done')
    expect(stateSetters[0]).toHaveBeenCalledWith([])
    expect(stateSetters[23]).toHaveBeenCalledWith(true)
    expect(stateSetters[23]).toHaveBeenCalledWith(false)
    expect(stateSetters[21]).toHaveBeenCalledWith('Pedido cancelado e reembolso solicitado com sucesso.')
    expect(toastSuccessMock).toHaveBeenCalledWith('Pedido cancelado com sucesso.')
  })

  it('executa updaters de estado internos ao adicionar item, trocar borda e mesclar CEP', async () => {
    stateValues[3] = { item: createMenuItem() }
    stateValues[4] = {
      'item-1': { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' },
    }

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      onAdd: (item: ReturnType<typeof createMenuItem>) => void
      onBorderToggle: (
        item: ReturnType<typeof createMenuItem>,
        border: { id: string; name: string; price: number; category: string } | null
      ) => void
      drawerProps: {
        addressStepProps: {
          onCepLookup: (value: string) => Promise<void>
        }
      }
    }

    props.onAdd(createMenuItem())
    props.onBorderToggle(createMenuItem(), {
      id: 'border-2',
      name: 'Cheddar',
      price: 6,
      category: 'border',
    })
    await props.drawerProps.addressStepProps.onCepLookup('12345-678')

    const addCartUpdater = stateSetters[0].mock.calls[0]?.[0] as (
      prev: Array<Record<string, unknown>>
    ) => Array<Record<string, unknown>>
    const resetBorderUpdater = stateSetters[4].mock.calls[0]?.[0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>
    const toggleBorderUpdater = stateSetters[4].mock.calls[1]?.[0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>
    const cepUpdater = stateSetters[12].mock.calls[0]?.[0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>

    expect(addCartUpdater([])).toEqual([
      expect.objectContaining({
        menu_item_id: 'item-1',
        quantity: 1,
      }),
    ])
    expect(resetBorderUpdater({
      'item-1': { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' },
      'item-2': { id: 'border-3', name: 'Chocolate', price: 7, category: 'border' },
    })).toEqual({
      'item-1': null,
      'item-2': { id: 'border-3', name: 'Chocolate', price: 7, category: 'border' },
    })
    expect(toggleBorderUpdater({
      'item-1': { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' },
    })).toEqual({
      'item-1': { id: 'border-2', name: 'Cheddar', price: 6, category: 'border' },
    })
    expect(cepUpdater({
      number: '10',
      neighborhood: 'Centro',
    })).toEqual({
      number: '10',
      neighborhood: 'Centro',
      zip_code: '12345-678',
      street: 'Rua B',
      city: 'São Paulo',
    })
  })

  it('processa restauracao, conversao de checkout, polling e persistencia do pedido ativo', async () => {
    stateValues[16] = 42
    stateValues[17] = 'order-pending'
    stateValues[22] = createPublicOrderStatus({ id: 'order-pending', status: 'confirmed' })

    const localStorageGetItemMock = vi.fn(() => '{"id":"order-restore","order_number":55}')
    const localStorageSetItemMock = vi.fn()
    const localStorageRemoveItemMock = vi.fn()
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: localStorageGetItemMock,
        setItem: localStorageSetItemMock,
        removeItem: localStorageRemoveItemMock,
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-1',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(localStorageGetItemMock).toHaveBeenCalledWith('chefops:active-order:chefops:no-table')
    expect(stateSetters[17]).toHaveBeenCalledWith('order-restore')
    expect(stateSetters[16]).toHaveBeenCalledWith(55)
    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-1')
    expect(fetch).toHaveBeenCalledWith('/api/public/orders/order-pending/status')
    expect(stateSetters[17]).toHaveBeenCalledWith('order-converted')
    expect(stateSetters[16]).toHaveBeenCalledWith(88)
    expect(stateSetters[22]).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order-converted',
        order_number: 88,
        status: 'confirmed',
        payment_status: 'paid',
      }),
    )
    expect(stateSetters[2]).toHaveBeenCalledWith('done')
    expect(stateSetters[0]).toHaveBeenCalledWith([])
    expect(stateSetters[1]).toHaveBeenCalledWith(true)
    expect(stateSetters[21]).toHaveBeenCalledWith('Pagamento confirmado. Pedido enviado para o estabelecimento.')
    expect(localStorageSetItemMock).toHaveBeenCalledWith(
      'chefops:active-order:chefops:no-table',
      '{"id":"order-pending","order_number":42}',
    )
    expect(setTimeoutMock).toHaveBeenCalled()
  })

  it('mostra aviso de pagamento aprovado durante o polling do checkout', async () => {
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/checkout/session-approved') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              status: 'approved',
            },
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-approved',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-approved')
    expect(stateSetters[21]).toHaveBeenCalledWith('Pagamento aprovado. Estamos confirmando seu pedido.')
    expect(setTimeoutMock).toHaveBeenCalled()
  })

  it('ignora polling de checkout com resposta nao-ok sem agendar nova tentativa', async () => {
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/checkout/session-not-ok') {
        return {
          ok: false,
          json: vi.fn().mockResolvedValue({
            error: 'Falha temporária',
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-not-ok',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-not-ok')
    expect(stateSetters[21]).not.toHaveBeenCalled()
    expect(setTimeoutMock).not.toHaveBeenCalled()
  })

  it('mantem aviso derivado do checkoutResult quando o pagamento segue pendente', async () => {
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/checkout/session-pending') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              status: 'pending',
            },
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-pending',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-pending')
    expect(stateSetters[21]).toHaveBeenCalledWith('Pagamento pendente. Assim que confirmar, seu pedido sera enviado.')
    expect(setTimeoutMock).toHaveBeenCalled()
  })

  it('mostra aviso de erro quando o polling do checkout falha por excecao', async () => {
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/checkout/session-throws') {
        throw new Error('Falha de rede')
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-throws',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-throws')
    expect(stateSetters[21]).toHaveBeenCalledWith('Nao foi possivel consultar o status do pagamento agora.')
    expect(setTimeoutMock).not.toHaveBeenCalled()
  })

  it('nao atualiza aviso quando o polling falha depois do cleanup', async () => {
    let rejectFetch: ((reason?: unknown) => void) | null = null

    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/api/public/checkout/session-cleanup') {
        return new Promise((_, reject) => {
          rejectFetch = reject
        })
      }

      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      })
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-cleanup',
        checkoutResult: 'pending',
      }),
    )

    expect(effectCleanups).not.toHaveLength(0)

    effectCleanups[0]?.()
    rejectFetch?.(new Error('Falha tardia'))
    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-cleanup')
    expect(stateSetters[21]).not.toHaveBeenCalled()
  })

  it('segue fluxo online sem mesa, vai para endereco e redireciona para o checkout', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'online'

    const location = { href: '' }
    vi.stubGlobal('window', {
      location,
      prompt: vi.fn(),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
        addressStepProps: {
          onSubmit: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onContinue()
    await props.drawerProps.addressStepProps.onSubmit()

    expect(stateSetters[2]).toHaveBeenCalledWith('address')
    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/mercado-pago', expect.objectContaining({
      method: 'POST',
    }))
    expect(stateSetters[20]).toHaveBeenCalledWith(true)
    expect(stateSetters[20]).toHaveBeenCalledWith(false)
    expect(location.href).toBe('https://mp.test/checkout')
  })

  it('inicia checkout online direto do passo de info quando existe mesa', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[7] = '123.456.789-09'
    stateValues[14] = 'online'

    const location = { href: '' }
    vi.stubGlobal('window', {
      location,
      prompt: vi.fn(),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: { id: 'table-1', number: '12' },
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onContinue()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/mercado-pago', expect.objectContaining({
      method: 'POST',
    }))
    expect(stateSetters[2]).not.toHaveBeenCalledWith('address')
    expect(location.href).toBe('https://mp.test/checkout')
  })

  it('nao cancela pedido quando o prompt é abortado', async () => {
    stateValues[17] = 'order-1'
    stateValues[22] = createPublicOrderStatus()

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(() => null),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: { id: 'table-1', number: '12' },
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        doneStepProps: {
          onCancelOrder: () => Promise<void>
        }
      }
    }

    await props.drawerProps.doneStepProps.onCancelOrder()

    expect(fetchMock).not.toHaveBeenCalledWith('/api/public/orders/order-1/cancel', expect.anything())
    expect(stateSetters[23]).not.toHaveBeenCalled()
  })

  it('interrompe lookup curto e CEP invalido sem bater na API', async () => {
    stateValues[5] = '(11) 9999-999'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'free',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
        }
        addressStepProps: {
          onCepLookup: (value: string) => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()
    await props.drawerProps.addressStepProps.onCepLookup('12345-67')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(stateSetters[13]).not.toHaveBeenCalled()
  })

  it('marca o telefone como verificado no plano free sem buscar cliente', async () => {
    stateValues[5] = '(11) 99999-9999'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'free',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(stateSetters[10]).toHaveBeenCalledWith(true)
  })

  it('mostra toast quando tenta validar telefone inválido no plano pago', async () => {
    stateValues[5] = '(11) 9999-999'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('Informe um telefone válido para continuar.')
  })

  it('marca cliente como novo quando lookup pago nao encontra cadastro', async () => {
    stateValues[5] = '(11) 99999-9999'
    stateValues[25] = '123456'

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/public/phone-verification/send') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { sent: true } }),
        }
      }

      if (url === '/api/public/phone-verification/verify') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { verified: true } }),
        }
      }

      if (url.startsWith('/api/customers?')) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: null }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
          onVerifyPhoneCode: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()
    await props.drawerProps.infoStepProps.onVerifyPhoneCode()

    expect(fetchMock).toHaveBeenCalledWith('/api/public/phone-verification/send', expect.anything())
    expect(fetchMock).toHaveBeenCalledWith('/api/public/phone-verification/verify', expect.anything())
    expect(fetchMock).toHaveBeenCalledWith('/api/customers?phone=11999999999&tenant_id=tenant-1')
    expect(stateSetters[9]).toHaveBeenCalledWith(true)
    expect(stateSetters[9]).toHaveBeenCalledWith(false)
    expect(stateSetters[8]).toHaveBeenCalledWith(null)
    expect(stateSetters[11]).toHaveBeenCalledWith(true)
    expect(stateSetters[6]).toHaveBeenCalledWith('')
    expect(stateSetters[10]).toHaveBeenCalledWith(true)
  })

  it('nao define endereco quando lookup pago encontra cliente sem endereco padrao', async () => {
    stateValues[5] = '(11) 99999-9999'
    stateValues[25] = '123456'

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/public/phone-verification/send') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { sent: true } }),
        }
      }

      if (url === '/api/public/phone-verification/verify') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { verified: true } }),
        }
      }

      if (url.startsWith('/api/customers?')) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              id: 'customer-1',
              name: 'Maria',
              phone: '11999999999',
              addresses: [
                {
                  zip_code: '12345-678',
                  street: 'Rua A',
                  number: '10',
                  city: 'São Paulo',
                  is_default: false,
                },
              ],
            },
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
          onVerifyPhoneCode: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()
    await props.drawerProps.infoStepProps.onVerifyPhoneCode()

    expect(fetchMock).toHaveBeenCalledWith('/api/customers?phone=11999999999&tenant_id=tenant-1')
    expect(stateSetters[12]).not.toHaveBeenCalled()
    expect(stateSetters[10]).toHaveBeenCalledWith(true)
  })

  it('limpa o código e volta para reenvio quando a verificação expira', async () => {
    stateValues[5] = '(11) 99999-9999'
    stateValues[25] = '123456'
    stateValues[26] = true

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/public/phone-verification/verify') {
        return {
          ok: false,
          json: vi.fn().mockResolvedValue({ error: 'O código expirou. Solicite um novo.' }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onVerifyPhoneCode: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onVerifyPhoneCode()

    expect(stateSetters[25]).toHaveBeenCalledWith('')
    expect(stateSetters[26]).toHaveBeenCalledWith(false)
    expect(toastErrorMock).toHaveBeenCalledWith('O código expirou. Solicite um novo.')
  })

  it('limpa o código e volta para reenvio quando atinge o limite de tentativas', async () => {
    stateValues[5] = '(11) 99999-9999'
    stateValues[25] = '123456'
    stateValues[26] = true

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/public/phone-verification/verify') {
        return {
          ok: false,
          json: vi.fn().mockResolvedValue({
            error: 'Muitas tentativas inválidas. Solicite um novo código.',
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onVerifyPhoneCode: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onVerifyPhoneCode()

    expect(stateSetters[25]).toHaveBeenCalledWith('')
    expect(stateSetters[26]).toHaveBeenCalledWith(false)
    expect(toastErrorMock).toHaveBeenCalledWith('Muitas tentativas inválidas. Solicite um novo código.')
  })

  it('barra avancos quando validacoes falham', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 9999-999'
    stateValues[6] = 'A'
    stateValues[12] = {}
    stateValues[14] = 'delivery'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
        addressStepProps: {
          onSubmit: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onContinue()
    await props.drawerProps.addressStepProps.onSubmit()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(stateSetters[18]).toHaveBeenCalledWith({
      name: 'Nome obrigatório',
      phone: 'Telefone inválido',
    })
    expect(stateSetters[18]).toHaveBeenCalledWith({
      zip_code: 'CEP obrigatório',
      street: 'Rua obrigatória',
      number: 'Número obrigatório',
      city: 'Cidade obrigatória',
    })
    expect(toastErrorMock).toHaveBeenNthCalledWith(
      1,
      'Confira os campos obrigatórios: Nome obrigatório, Telefone inválido'
    )
    expect(toastErrorMock).toHaveBeenNthCalledWith(
      2,
      'Confira os campos obrigatórios: CEP obrigatório, Rua obrigatória, Número obrigatório, Cidade obrigatória'
    )
    expect(stateSetters[2]).not.toHaveBeenCalledWith('address')
  })

  it('mostra erros no checkout online quando a API falha ou nao retorna link', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'online'

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Falha Mercado Pago' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: {} }),
      })

    const alertMock = vi.fn()
    const location = { href: '' }

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', alertMock)
    vi.stubGlobal('window', {
      location,
      prompt: vi.fn(),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
        addressStepProps: {
          onSubmit: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onContinue()
    await props.drawerProps.addressStepProps.onSubmit()
    await props.drawerProps.addressStepProps.onSubmit()

    expect(alertMock).toHaveBeenCalledWith('Falha Mercado Pago')
    expect(alertMock).toHaveBeenCalledWith('O Mercado Pago nao retornou um link de pagamento.')
    expect(location.href).toBe('')
    expect(stateSetters[20]).toHaveBeenCalledWith(true)
    expect(stateSetters[20]).toHaveBeenCalledWith(false)
  })

  it('mantem endereco atual quando a busca de CEP nao retorna dados', async () => {
    stateValues[12] = {
      zip_code: '11111-111',
      street: 'Rua Antiga',
      number: '10',
      city: 'São Paulo',
    }

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/cep/12345678') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: null }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        addressStepProps: {
          onCepLookup: (value: string) => Promise<void>
        }
      }
    }

    await props.drawerProps.addressStepProps.onCepLookup('12345-678')

    expect(fetchMock).toHaveBeenCalledWith('/api/cep/12345678')
    expect(stateSetters[12]).not.toHaveBeenCalled()
    expect(stateSetters[13]).toHaveBeenCalledWith(true)
    expect(stateSetters[13]).toHaveBeenCalledWith(false)
  })

  it('bloqueia o pedido pago quando o cadastro do cliente nao retorna id', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[7] = '123.456.789-09'
    stateValues[14] = 'table'

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/customers') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: {} }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: { id: 'table-1', number: '12' },
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onContinue()

    expect(fetch).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant-1',
        name: 'Maria',
        phone: '11999999999',
        cpf: '123.456.789-09',
        address: undefined,
      }),
    })
    expect(createOrderMutateAsyncMock).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith('Nao foi possivel identificar o cliente para concluir o pedido.')
  })

  it('cria pedido com endereco quando a entrega é confirmada no passo final', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[7] = '123.456.789-09'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'delivery'

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        addressStepProps: {
          onSubmit: () => Promise<void>
        }
      }
    }

    await props.drawerProps.addressStepProps.onSubmit()

    expect(fetch).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant-1',
        name: 'Maria',
        phone: '11999999999',
        cpf: '123.456.789-09',
        address: {
          zip_code: '12345-678',
          street: 'Rua A',
          number: '10',
          city: 'São Paulo',
        },
      }),
    })
    expect(createOrderMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method: 'delivery',
        customer_id: 'customer-created',
        delivery_address: {
          zip_code: '12345-678',
          street: 'Rua A',
          number: '10',
          city: 'São Paulo',
        },
      }),
    )
    expect(stateSetters[17]).toHaveBeenCalledWith('order-created')
    expect(stateSetters[16]).toHaveBeenCalledWith(77)
    expect(stateSetters[21]).toHaveBeenCalledWith(
      'Pedido enviado para o estabelecimento. O pagamento será realizado na entrega.'
    )
    expect(stateSetters[2]).toHaveBeenCalledWith('done')
  })

  it('cria pedido no plano free sem cadastrar cliente antes', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'delivery'

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: null }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'free',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        addressStepProps: {
          onSubmit: () => Promise<void>
        }
      }
    }

    await props.drawerProps.addressStepProps.onSubmit()

    expect(fetchMock).not.toHaveBeenCalledWith('/api/customers', expect.anything())
    expect(createOrderMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: 'Maria',
        customer_id: undefined,
        payment_method: 'delivery',
      }),
    )
    expect(stateSetters[17]).toHaveBeenCalledWith('order-created')
  })

  it('omite cpf e endereco no cadastro pago quando os dados opcionais nao existem', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[7] = ''
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'delivery'

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        addressStepProps: {
          onSubmit: () => Promise<void>
        }
      }
    }

    await props.drawerProps.addressStepProps.onSubmit()

    expect(fetch).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant-1',
        name: 'Maria',
        phone: '11999999999',
        cpf: undefined,
        address: {
          zip_code: '12345-678',
          street: 'Rua A',
          number: '10',
          city: 'São Paulo',
        },
      }),
    })
    expect(createOrderMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: 'Maria',
        customer_id: 'customer-created',
        payment_method: 'delivery',
        delivery_address: {
          zip_code: '12345-678',
          street: 'Rua A',
          number: '10',
          city: 'São Paulo',
        },
      }),
    )
  })

  it('navega entre os steps do drawer e fecha no passo final', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'delivery'
    stateValues[16] = 42
    stateValues[17] = 'order-1'
    stateValues[22] = createPublicOrderStatus({ id: 'order-1', status: 'confirmed' })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        cartStepProps: {
          onContinue: () => void
        }
        infoStepProps: {
          onBack: () => void
        }
        addressStepProps: {
          onBack: () => void
        }
        doneStepProps: {
          onClose: () => void
        }
      }
    }

    props.drawerProps.cartStepProps.onContinue()
    props.drawerProps.infoStepProps.onBack()
    props.drawerProps.addressStepProps.onBack()
    props.drawerProps.doneStepProps.onClose()

    expect(stateSetters[2]).toHaveBeenCalledWith('info')
    expect(stateSetters[2]).toHaveBeenCalledWith('cart')
    expect(stateSetters[2]).toHaveBeenCalledWith('info')
    expect(stateSetters[1]).toHaveBeenCalledWith(false)
  })

  it('repassa atualizacao de endereco e calcula o estado dos passos do pedido', async () => {
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[22] = createPublicOrderStatus({ id: 'order-1', status: 'confirmed' })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        addressStepProps: {
          onAddressChange: (
            updater: (prev: Record<string, unknown>) => Record<string, unknown>
          ) => void
        }
        doneStepProps: {
          getStepState: (step: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled') => string
        }
      }
    }

    props.drawerProps.addressStepProps.onAddressChange((prev) => ({
      ...prev,
      street: 'Rua Atualizada',
    }))

    expect(stateSetters[12]).toHaveBeenCalledTimes(1)
    const updater = stateSetters[12].mock.calls[0]?.[0] as (prev: Record<string, unknown>) => Record<string, unknown>
    expect(updater({
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    })).toEqual({
      zip_code: '12345-678',
      street: 'Rua Atualizada',
      number: '10',
      city: 'São Paulo',
    })

    expect(props.drawerProps.doneStepProps.getStepState('pending')).toBe('done')
    expect(props.drawerProps.doneStepProps.getStepState('confirmed')).toBe('current')
    expect(props.drawerProps.doneStepProps.getStepState('ready')).toBe('upcoming')
  })

  it('aciona handlers do carrinho e respeita confirmacao ao limpar', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 2,
        extras: [],
      },
    ]

    const confirmMock = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    vi.stubGlobal('confirm', confirmMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        cartStepProps: {
          onIncrement: (index: number) => void
          onDecrement: (index: number) => void
          onRemove: (index: number) => void
          onClear: () => void
        }
      }
    }

    props.drawerProps.cartStepProps.onIncrement(0)
    props.drawerProps.cartStepProps.onDecrement(0)
    props.drawerProps.cartStepProps.onRemove(0)
    props.drawerProps.cartStepProps.onClear()
    props.drawerProps.cartStepProps.onClear()

    expect(stateSetters[0]).toHaveBeenCalledTimes(4)

    const incrementUpdater = stateSetters[0].mock.calls[0]?.[0] as (cart: Array<Record<string, unknown>>) => Array<Record<string, unknown>>
    const decrementUpdater = stateSetters[0].mock.calls[1]?.[0] as (cart: Array<Record<string, unknown>>) => Array<Record<string, unknown>>
    const removeUpdater = stateSetters[0].mock.calls[2]?.[0] as (cart: Array<Record<string, unknown>>) => Array<Record<string, unknown>>

    expect(incrementUpdater(stateValues[0] as Array<Record<string, unknown>>)).toEqual([
      expect.objectContaining({ quantity: 3 }),
    ])
    expect(decrementUpdater(stateValues[0] as Array<Record<string, unknown>>)).toEqual([
      expect.objectContaining({ quantity: 1 }),
    ])
    expect(removeUpdater(stateValues[0] as Array<Record<string, unknown>>)).toEqual([])
    expect(confirmMock).toHaveBeenCalledWith('Deseja limpar o carrinho?')
    expect(stateSetters[0]).toHaveBeenCalledWith([])
  })

  it('executa a action do toast para abrir o carrinho apos adicionar item', async () => {
    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      onAdd: (item: ReturnType<typeof createMenuItem>) => void
    }

    props.onAdd(createMenuItem())

    const cartToast = toastSuccessCalls.find((call) => call.title.includes('adicionado ao carrinho'))
    expect(cartToast?.options?.action).toBeTruthy()

    const action = cartToast?.options?.action as { onClick: () => void; label: string }
    expect(action.label).toBe('Ver carrinho')

    action.onClick()

    expect(stateSetters[1]).toHaveBeenCalledWith(true)
    expect(stateSetters[2]).toHaveBeenCalledWith('cart')
  })

  it('mostra erros no submit do pedido, cancelamento e polling de checkout', async () => {
    stateValues[0] = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza Margherita',
        price: 32,
        quantity: 1,
        extras: [],
      },
    ]
    stateValues[5] = '(11) 99999-9999'
    stateValues[6] = 'Maria'
    stateValues[7] = '123.456.789-09'
    stateValues[12] = {
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
    }
    stateValues[14] = 'table'
    stateValues[17] = 'order-1'
    stateValues[22] = createPublicOrderStatus()

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/customers') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ data: { id: 'customer-created' } }),
        }
      }

      if (url === '/api/public/orders/order-1/cancel') {
        return {
          ok: false,
          json: vi.fn().mockResolvedValue({ error: 'Cancelamento falhou' }),
        }
      }

      if (url === '/api/public/checkout/session-error') {
        throw new Error('network')
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    const alertMock = vi.fn()
    createOrderMutateAsyncMock.mockRejectedValueOnce(new Error('Pedido falhou'))

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', alertMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: { id: 'table-1', number: '12' },
        checkoutSessionId: 'session-error',
        checkoutResult: 'pending',
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onContinue: () => Promise<void>
        }
        doneStepProps: {
          onCancelOrder: () => Promise<void>
        }
      }
    }

    await Promise.resolve()
    await props.drawerProps.infoStepProps.onContinue()
    await props.drawerProps.doneStepProps.onCancelOrder()

    expect(alertMock).toHaveBeenCalledWith('Pedido falhou')
    expect(alertMock).toHaveBeenCalledWith('Cancelamento falhou')
    expect(stateSetters[21]).toHaveBeenCalledWith('Nao foi possivel consultar o status do pagamento agora.')
    expect(stateSetters[23]).toHaveBeenCalledWith(true)
    expect(stateSetters[23]).toHaveBeenCalledWith(false)
  })

  it('remove o pedido salvo quando o status nao deve mais persistir', async () => {
    stateValues[16] = 42
    stateValues[17] = 'order-1'
    stateValues[22] = createPublicOrderStatus({ status: 'cancelled' })

    const removeItemMock = vi.fn()
    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: removeItemMock,
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    expect(removeItemMock).toHaveBeenCalledWith('chefops:active-order:chefops:no-table')
  })

  it('ignora checkout convertido sem order id criado', async () => {
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/checkout/session-without-order-id') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              status: 'converted',
              created_order_id: null,
              order_number: 88,
              order_status: 'confirmed',
              payment_status: 'paid',
            },
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-without-order-id',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-without-order-id')
    expect(stateSetters[17]).not.toHaveBeenCalled()
    expect(stateSetters[16]).not.toHaveBeenCalled()
    expect(stateSetters[22]).not.toHaveBeenCalled()
    expect(stateSetters[21]).not.toHaveBeenCalled()
    expect(setTimeoutMock).not.toHaveBeenCalled()
  })

  it('nao agenda novo polling quando o checkout ja veio convertido sem order number', async () => {
    const setTimeoutMock = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/checkout/session-converted-without-number') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              status: 'converted',
              created_order_id: 'order-1',
              order_number: null,
            },
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-converted-without-number',
        checkoutResult: 'pending',
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledWith('/api/public/checkout/session-converted-without-number')
    expect(stateSetters[21]).toHaveBeenCalledWith('Pagamento pendente. Assim que confirmar, seu pedido sera enviado.')
    expect(stateSetters[17]).not.toHaveBeenCalled()
    expect(stateSetters[16]).not.toHaveBeenCalled()
    expect(stateSetters[22]).not.toHaveBeenCalled()
    expect(setTimeoutMock).not.toHaveBeenCalled()
  })

  it('nao agenda novo polling quando o pedido ja foi entregue', async () => {
    stateValues[17] = 'order-delivered'

    const setTimeoutMock = vi.fn()
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/public/orders/order-delivered/status') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: createPublicOrderStatus({
              id: 'order-delivered',
              status: 'delivered',
              payment_status: 'paid',
            }),
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(() => 'Cliente desistiu'),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledWith('/api/public/orders/order-delivered/status')
    expect(stateSetters[22]).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order-delivered',
        status: 'delivered',
        payment_status: 'paid',
      }),
    )
    expect(stateSetters[21]).toHaveBeenCalledWith('Pedido entregue com sucesso.')
    expect(setTimeoutMock).not.toHaveBeenCalled()
  })

  it('atualiza o aviso quando o polling do pedido retorna preparo', async () => {
    stateValues[17] = 'order-preparing'

    const setTimeoutMock = vi.fn()
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/public/orders/order-preparing/status') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: createPublicOrderStatus({
              id: 'order-preparing',
              status: 'preparing',
              payment_status: 'pending',
              payment_method: 'delivery',
              delivery_status: 'waiting_dispatch',
            }),
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: vi.fn(),
      setTimeout: setTimeoutMock,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledWith('/api/public/orders/order-preparing/status')
    expect(stateSetters[21]).toHaveBeenCalledWith('Seu pedido está em preparo.')
    expect(setTimeoutMock).toHaveBeenCalled()
  })

  it('permite confirmar o recebimento no acompanhamento do pedido', async () => {
    stateValues[16] = 123
    stateValues[17] = 'order-3'
    stateValues[22] = createPublicOrderStatus({
      id: 'order-3',
      order_number: 123,
      status: 'ready',
      payment_status: 'pending',
      payment_method: 'delivery',
      delivery_status: 'out_for_delivery',
    })

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/public/orders/order-3/confirm-delivery') {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: createPublicOrderStatus({
              id: 'order-3',
              order_number: 123,
              status: 'delivered',
              payment_status: 'pending',
              payment_method: 'delivery',
              delivery_status: 'delivered',
            }),
          }),
        }
      }

      return {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: null }),
      }
    }))

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        doneStepProps: {
          onConfirmDelivery: () => Promise<void>
        }
      }
    }

    await props.drawerProps.doneStepProps.onConfirmDelivery()

    expect(fetch).toHaveBeenCalledWith('/api/public/orders/order-3/confirm-delivery', {
      method: 'POST',
    })
    expect(stateSetters[22]).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order-3',
        status: 'delivered',
        delivery_status: 'delivered',
      }),
    )
    expect(stateSetters[21]).toHaveBeenCalledWith('Pedido entregue com sucesso.')
    expect(toastSuccessMock).toHaveBeenCalledWith('Entrega confirmada com sucesso.')
  })

  it('executa cleanups dos pollings de checkout e pedido', async () => {
    stateValues[17] = 'order-1'

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: 'session-pending',
        checkoutResult: 'pending',
      }),
    )

    expect(effectCleanups).toHaveLength(2)

    effectCleanups.forEach((cleanup) => cleanup())
  })

  it('mantem passos como upcoming sem status publico e aborta cancelamento sem pedido ativo', async () => {
    const fetchMock = vi.fn()
    const promptMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { href: '' },
      prompt: promptMock,
      setTimeout: vi.fn(),
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        doneStepProps: {
          getStepState: (step: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled') => string
          onCancelOrder: () => Promise<void>
        }
      }
    }

    expect(props.drawerProps.doneStepProps.getStepState('pending')).toBe('upcoming')
    expect(props.drawerProps.doneStepProps.getStepState('confirmed')).toBe('upcoming')

    await props.drawerProps.doneStepProps.onCancelOrder()

    expect(promptMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignora selecao de meio a meio quando nenhum modal de sabor está aberto', async () => {
    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      onSelectHalfFlavor: (item: ReturnType<typeof createMenuItem>) => void
    }

    props.onSelectHalfFlavor(createMenuItem({ id: 'item-2', name: 'Calabresa', price: 35 }))

    expect(stateSetters[0]).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('aciona callbacks simples do passo de informacoes', async () => {
    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'basic',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: null,
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onCustomerNameChange: (value: string) => void
          onPaymentMethodChange: (value: string) => void
          onNotesChange: (value: string) => void
        }
      }
    }

    props.drawerProps.infoStepProps.onCustomerNameChange('Maria')
    props.drawerProps.infoStepProps.onPaymentMethodChange('delivery')
    props.drawerProps.infoStepProps.onNotesChange('Sem cebola')

    expect(stateSetters[6]).toHaveBeenCalledWith('Maria')
    expect(stateSetters[14]).toHaveBeenCalledWith('delivery')
    expect(stateSetters[15]).toHaveBeenCalledWith('Sem cebola')
  })

  it('nao envia codigo de telefone para pedidos de mesa no plano pago', async () => {
    stateValues[5] = '(11) 99999-9999'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'Pizzaria ChefOps',
          slug: 'chefops',
          plan: 'standard',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [createMenuItem()],
        tableInfo: { id: 'table-1', number: '12' },
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    const props = capturedShellProps as {
      drawerProps: {
        infoStepProps: {
          onPhoneLookup: () => Promise<void>
        }
      }
    }

    await props.drawerProps.infoStepProps.onPhoneLookup()

    expect(fetchMock).not.toHaveBeenCalledWith('/api/public/phone-verification/send', expect.anything())
    expect(stateSetters[10]).toHaveBeenCalledWith(true)
  })
})
