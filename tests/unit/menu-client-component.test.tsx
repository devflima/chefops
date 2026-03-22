import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const createOrderMutateAsyncMock = vi.fn()
const toastSuccessMock = vi.fn()

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
      effect()
    },
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: (...args: Parameters<typeof toastSuccessMock>) => toastSuccessMock(...args),
  },
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useCreateOrder: () => ({
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

    expect(fetch).toHaveBeenCalledWith('/api/customers?phone=11999999999&tenant_id=tenant-1')
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
        payment_method: 'table',
      }),
    )
    expect(fetch).toHaveBeenCalledWith('/api/public/orders/order-1/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelled_reason: 'Cliente desistiu' }),
    })
    expect(stateSetters[9]).toHaveBeenCalledWith(true)
    expect(stateSetters[9]).toHaveBeenCalledWith(false)
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
})
