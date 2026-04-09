import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildPublicOrderCancelPayload,
  buildPublicCheckoutPayload,
  buildPublicOrderPayload,
  createCartItem,
  createPublicOrderStatusFromOrder,
  createPublicOrderStatusFromCheckout,
  decrementCartItem,
  filterGroupsByCategory,
  formatCEP,
  formatCPF,
  formatPhone,
  getAddressFlowTarget,
  getAddressSubmitLabel,
  getActiveOrderStorageKey,
  getBorders,
  getCancelSuccessNotice,
  getCancelOrderErrorMessage,
  getCartDrawerState,
  getCartItemLineTotal,
  getCancelledOrderMessage,
  getCartTotals,
  getCreatedPublicOrderNotice,
  getCheckoutConvertedNotice,
  getCheckoutPollingErrorNotice,
  getCheckoutStepTitle,
  getCheckoutNoticeFromResult,
  getContinueFlowTarget,
  getCustomerBannerState,
  getConvertedCheckoutState,
  getDeliveryStepMessage,
  getHalfFlavorOptions,
  getInfoContinueLabel,
  getOrderStepState,
  getOrderSteps,
  getOpenCartState,
  getPaymentStatusLabel,
  getPhoneChangeState,
  getPublicOrderHeadline,
  getPublicOrderCompletionTitle,
  getPublicOrderCompletionSubtitle,
  getPublicOrderCompletionCloseLabel,
  getPublicOrderProgressTitle,
  getPublicOrderPaymentLabel,
  getPublicOrderReferenceLabel,
  getPublicOrderStatusCardMessage,
  getPublicOrderStatusCardActionLabel,
  getPublicOrderStatusCardTone,
  getPublicOrderStatusCardTitle,
  getPublicOrderStatusNotice,
  getPublicOrderTrackingMessage,
  getValidationErrorToastMessage,
  getLookupCustomerFoundState,
  getLookupCustomerMissingState,
  getOnlineCheckoutErrorMessage,
  getPublicOrderPlacementErrorMessage,
  getSuccessfulPublicOrderState,
  getPublicCheckoutProcessingState,
  getTrackOrderState,
  groupMenuItems,
  incrementCartItem,
  isDeliveryStepCompleted,
  normalizePublicMenuItems,
  parseStoredActiveOrder,
  normalizeTenantDeliverySettings,
  paymentOptionsByContext,
  removeCartItem,
  resolvePublicCheckoutUrl,
  serializeStoredActiveOrder,
  shouldRequirePhoneVerification,
  shouldShowCancelOrderButton,
  shouldShowDeliveryStep,
  shouldContinueCheckoutPolling,
  shouldContinueOrderPolling,
  shouldPersistActiveOrder,
  getCheckoutNoticeTone,
  shouldShowCheckoutNoticeBanner,
  shouldShowPublicDeliveryConfirmButton,
  validateCPF,
  validateCustomerAddress,
  validateCustomerInfo,
} from '@/features/menu/public-menu'

const createOrderMock = vi.fn()
const supabaseFromMock = vi.fn()
const notFoundMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useCreateOrder: () => ({
    isPending: false,
    mutateAsync: createOrderMock,
  }),
  useCreatePublicOrder: () => ({
    isPending: false,
    mutateAsync: createOrderMock,
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: Parameters<typeof supabaseFromMock>) => supabaseFromMock(...args),
  }),
}))

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    notFound: () => notFoundMock(),
  }
})

describe('public menu helpers', () => {
  it('formata dados e valida cpf', () => {
    expect(getActiveOrderStorageKey('chefops', 'table-1')).toBe('chefops:active-order:chefops:table-1')
    expect(formatPhone('11999999999')).toBe('(11) 99999-9999')
    expect(formatCPF('12345678909')).toBe('123.456.789-09')
    expect(formatCEP('12345678')).toBe('12345-678')
    expect(validateCPF('123.456.789-09')).toBe(true)
    expect(validateCPF('00000003700')).toBe(true)
    expect(validateCPF('00000000604')).toBe(true)
    expect(validateCPF('123.456.789-00')).toBe(false)
    expect(validateCPF('00000003710')).toBe(false)
    expect(validateCPF('111.111.111-11')).toBe(false)
    expect(getPhoneChangeState('11999999999')).toEqual({
      phone: '(11) 99999-9999',
      phoneVerified: false,
      existingCustomer: null,
      isNewCustomer: false,
      customerName: '',
    })
  })

  it('agrupa cardapio, calcula totais e filtra categorias', () => {
    const groups = groupMenuItems([
      {
        id: 'item-1',
        tenant_id: 'tenant-1',
        category_id: 'cat-1',
        name: 'Pizza',
        description: null,
        price: 30,
        available: true,
        display_order: 1,
        category: { id: 'cat-1', name: 'Pizzas' },
        extras: [{ extra: { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' } }],
      },
      {
        id: 'item-2',
        tenant_id: 'tenant-1',
        category_id: null,
        name: 'Suco',
        description: null,
        price: 8,
        available: true,
        display_order: 2,
        category: null,
        extras: [],
      },
    ])

    expect(groups).toHaveLength(2)
    expect(filterGroupsByCategory(groups, 'cat-1')).toHaveLength(1)
    expect(getBorders(groups[0].items[0]).map((item) => item.name)).toEqual(['Catupiry'])

    expect(getCartTotals(
      [
        {
          menu_item_id: 'item-1',
          name: 'Pizza',
          price: 30,
          quantity: 2,
          extras: [{ name: 'Catupiry', price: 5 }],
        },
      ],
      null,
      { delivery_enabled: true, flat_fee: 8 },
    )).toEqual({
      cartTotal: 70,
      deliveryFee: 8,
      orderTotal: 78,
      cartCount: 2,
    })

    expect(getCartTotals(
      [
        {
          menu_item_id: 'item-2',
          name: 'Suco',
          price: 8,
          quantity: 1,
        },
      ] as never,
      null,
      { delivery_enabled: true, flat_fee: null as never },
    )).toEqual({
      cartTotal: 8,
      deliveryFee: 0,
      orderTotal: 8,
      cartCount: 1,
    })
  })

  it('valida dados do cliente, endereco, steps e normalizacao de joins', () => {
    expect(validateCustomerInfo('', '1199', '', { id: 'table-1', number: '10' }, 'table')).toEqual({
      name: 'Nome obrigatório',
      phone: 'Telefone inválido',
      cpf: 'CPF inválido',
    })

    expect(validateCustomerInfo('Maria', '(11) 99999-9999', '', null, '')).toEqual({
      payment_method: 'Selecione uma forma de pagamento',
    })

    expect(validateCustomerAddress({ street: 'Rua A' })).toEqual({
      zip_code: 'CEP obrigatório',
      number: 'Número obrigatório',
      city: 'Cidade obrigatória',
    })

    expect(getOrderStepState('preparing', ['pending', 'confirmed', 'preparing', 'ready'], 'confirmed')).toBe('done')
    expect(getOrderStepState('preparing', ['pending', 'confirmed', 'preparing', 'ready'], 'preparing')).toBe('current')
    expect(getOrderStepState('cancelled', ['pending', 'confirmed'], 'pending')).toBe('upcoming')

    expect(paymentOptionsByContext.table).toHaveLength(3)
    expect(normalizeTenantDeliverySettings([{ delivery_enabled: true, flat_fee: 8 }])).toEqual({
      delivery_enabled: true,
      flat_fee: 8,
    })
    expect(normalizeTenantDeliverySettings(null)).toBeNull()

    expect(normalizePublicMenuItems([
      {
        id: 'item-1',
        tenant_id: 'tenant-1',
        category_id: 'cat-1',
        name: 'Pizza',
        description: null,
        price: 30,
        available: true,
        display_order: 1,
        category: [{ id: 'cat-1', name: 'Pizzas' }],
        extras: [{ extra: [{ id: 'extra-1', name: 'Catupiry', price: 5, category: 'border' }] }],
      },
    ] as never)).toMatchObject([
      {
        category: { id: 'cat-1', name: 'Pizzas' },
        extras: [{ extra: { id: 'extra-1', name: 'Catupiry' } }],
      },
    ])

    expect(normalizePublicMenuItems([
      {
        id: 'item-2',
        tenant_id: 'tenant-1',
        category_id: null,
        name: 'Suco',
        description: null,
        price: 8,
        available: true,
        display_order: 2,
        category: undefined,
        extras: [{ extra: null }, { extra: undefined }],
      },
    ] as never)).toMatchObject([
      {
        category: null,
        extras: [],
      },
    ])
  })

  it('cobre fallbacks e ramos simples restantes dos helpers públicos', () => {
    const plainItem = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: null,
      name: 'Suco',
      description: null,
      price: 8,
      available: true,
      display_order: 1,
      category: null,
      extras: [],
    } as const

    expect(createCartItem(plainItem)).toEqual({
      menu_item_id: 'item-1',
      name: 'Suco',
      price: 8,
      quantity: 1,
      extras: [],
      half_flavor: undefined,
    })

    expect(decrementCartItem([], 0)).toEqual([])
    expect(filterGroupsByCategory(groupMenuItems([plainItem as never]), null)).toHaveLength(1)
    expect(getCartTotals([{ menu_item_id: 'item-1', name: 'Suco', price: 8, quantity: 1 }], { id: 'table-1', number: '10' }, {
      delivery_enabled: true,
      flat_fee: 12,
    })).toEqual({
      cartTotal: 8,
      deliveryFee: 0,
      orderTotal: 8,
      cartCount: 1,
    })
    expect(getBorders(plainItem as never)).toEqual([])

    expect(validateCustomerInfo('Maria', '(11) 99999-9999', '', null, 'delivery')).toEqual({})
    expect(validateCustomerAddress({
      zip_code: '12345-678',
      street: 'Rua A',
      number: '10',
      city: 'Sao Paulo',
    })).toEqual({})

    expect(getPublicOrderHeadline({
      id: 'order-1',
      order_number: 42,
      status: 'ready',
      payment_status: 'pending',
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    }, [{ key: 'pending', label: 'Recebido' }] as never)).toBe('andamento')
    expect(getCustomerBannerState(true, null, false)).toBeNull()
    expect(getAddressSubmitLabel('delivery', true)).toBe('Processando...')
    expect(shouldShowDeliveryStep(null)).toBe(false)
    expect(isDeliveryStepCompleted({
      id: 'order-1',
      order_number: 42,
      status: 'ready',
      payment_status: 'paid',
      payment_method: 'delivery',
      delivery_status: 'delivered',
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    })).toBe(true)
    expect(getDeliveryStepMessage({
      id: 'order-1',
      order_number: 42,
      status: 'ready',
      payment_status: 'paid',
      payment_method: 'delivery',
      delivery_status: 'out_for_delivery',
      delivery_driver: null,
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    })).toBe('Seu pedido saiu para entrega.')

    expect(normalizeTenantDeliverySettings({
      delivery_enabled: false,
      flat_fee: 0,
    })).toEqual({
      delivery_enabled: false,
      flat_fee: 0,
    })
    expect(normalizeTenantDeliverySettings(undefined as never)).toBeNull()

    expect(normalizePublicMenuItems([
      {
        ...plainItem,
        category: { id: 'cat-1', name: 'Bebidas' },
        extras: [{ extra: { id: 'extra-1', name: 'Gelo', price: 0, category: 'addon' } }],
      },
    ] as never)).toMatchObject([
      {
        category: { id: 'cat-1', name: 'Bebidas' },
        extras: [{ extra: { id: 'extra-1', name: 'Gelo', price: 0, category: 'addon' } }],
      },
    ])

    expect(normalizeTenantDeliverySettings([] as never)).toBeNull()

    expect(normalizePublicMenuItems([
      {
        ...plainItem,
        category: [],
        extras: [{ extra: [] }],
      },
    ] as never)).toMatchObject([
      {
        category: null,
        extras: [],
      },
    ])

    expect(normalizePublicMenuItems([
      {
        ...plainItem,
        category: { id: 'cat-2', name: 'Doces' },
        extras: undefined,
      },
    ] as never)).toMatchObject([
      {
        category: { id: 'cat-2', name: 'Doces' },
        extras: [],
      },
    ])
  })

  it('controla mutacoes do carrinho e fluxo de persistencia do pedido', () => {
    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Pizza',
      description: null,
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [],
    }

    const cartItem = createCartItem(item, { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' }, {
      ...item,
      id: 'item-2',
      name: 'Calabresa',
      price: 32,
    })

    expect(cartItem).toEqual({
      menu_item_id: 'item-1',
      name: 'Pizza / Calabresa',
      price: 32,
      quantity: 1,
      extras: [{ name: 'Catupiry', price: 5 }],
      half_flavor: { menu_item_id: 'item-2', name: 'Calabresa' },
    })

    expect(incrementCartItem([cartItem], 0)[0].quantity).toBe(2)
    expect(incrementCartItem([cartItem], 1)).toEqual([cartItem])
    expect(decrementCartItem([{ ...cartItem, quantity: 2 }], 0)[0].quantity).toBe(1)
    expect(decrementCartItem([
      { ...cartItem, quantity: 2 },
      { ...cartItem, menu_item_id: 'item-4', quantity: 3 },
    ], 0)).toMatchObject([
      { menu_item_id: 'item-1', quantity: 1 },
      { menu_item_id: 'item-4', quantity: 3 },
    ])
    expect(decrementCartItem([cartItem], 0)).toEqual([])
    expect(removeCartItem([cartItem, { ...cartItem, menu_item_id: 'item-3' }], 0)).toHaveLength(1)

    expect(serializeStoredActiveOrder('order-1', 42)).toBe('{"id":"order-1","order_number":42}')
    expect(parseStoredActiveOrder('{"id":"order-1","order_number":42}')).toEqual({
      id: 'order-1',
      order_number: 42,
    })
    expect(parseStoredActiveOrder('{"id":"order-1"}')).toBeNull()
    expect(parseStoredActiveOrder('{"id":"order-1","order_number":"42"}')).toBeNull()
    expect(parseStoredActiveOrder('{invalid')).toBeNull()
    expect(parseStoredActiveOrder(null)).toBeNull()
    expect(shouldPersistActiveOrder('pending')).toBe(true)
    expect(shouldPersistActiveOrder('delivered')).toBe(false)
    expect(shouldContinueOrderPolling('confirmed')).toBe(true)
    expect(shouldContinueOrderPolling('cancelled')).toBe(false)
  })

  it('controla notices e polling do checkout online', () => {
    expect(getCheckoutNoticeFromResult('pending')).toContain('Pagamento pendente')
    expect(getCheckoutNoticeFromResult('failure')).toContain('nao foi concluido')
    expect(getCheckoutNoticeFromResult(null)).toBeNull()
    expect(getCheckoutConvertedNotice()).toContain('Pagamento confirmado')
    expect(getCheckoutPollingErrorNotice()).toContain('status do pagamento')

    expect(shouldContinueCheckoutPolling('approved', 1)).toBe(true)
    expect(shouldContinueCheckoutPolling('converted', 1)).toBe(false)
    expect(shouldContinueCheckoutPolling('approved', 10)).toBe(false)

    const publicStatus = createPublicOrderStatusFromCheckout({
      created_order_id: 'order-1',
      order_number: 42,
      order_status: 'confirmed',
      payment_status: 'paid',
    })

    expect(publicStatus).toMatchObject({
      id: 'order-1',
      order_number: 42,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'online',
    })
    expect(createPublicOrderStatusFromCheckout({
      created_order_id: 'order-2',
      order_number: 43,
    })).toMatchObject({
      id: 'order-2',
      order_number: 43,
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'online',
    })
    expect(createPublicOrderStatusFromCheckout({ created_order_id: null, order_number: 42 })).toBeNull()
    expect(createPublicOrderStatusFromOrder({
      id: 'order-2',
      order_number: 43,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'delivery',
      delivery_status: 'waiting_dispatch',
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    })).toEqual({
      id: 'order-2',
      order_number: 43,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'delivery',
      delivery_status: 'waiting_dispatch',
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    })
    expect(getSuccessfulPublicOrderState({
      orderId: 'order-1',
      orderNumber: 42,
      publicOrderStatus: publicStatus!,
    })).toEqual({
      orderId: 'order-1',
      orderNumber: 42,
      publicOrderStatus: publicStatus,
      checkoutStep: 'done',
      cart: [],
    })
    expect(getCartDrawerState('cart')).toEqual({ cartOpen: true, checkoutStep: 'cart' })
    expect(getOpenCartState()).toEqual({ cartOpen: true, checkoutStep: 'cart' })
    expect(getTrackOrderState()).toEqual({ cartOpen: true, checkoutStep: 'done' })
    expect(getConvertedCheckoutState({
      orderId: 'order-1',
      orderNumber: 42,
      publicOrderStatus: publicStatus!,
    })).toEqual({
      orderId: 'order-1',
      orderNumber: 42,
      publicOrderStatus: publicStatus!,
      checkoutStep: 'done',
      cart: [],
      cartOpen: true,
      checkoutNotice: 'Pagamento confirmado. Pedido enviado para o estabelecimento.',
    })
    expect(getPublicCheckoutProcessingState(true, false)).toBe(true)
    expect(getPublicCheckoutProcessingState(false, true)).toBe(true)
    expect(getPublicCheckoutProcessingState(false, false)).toBe(false)
    expect(getCreatedPublicOrderNotice('pending', 'delivery')).toBe(
      'Pedido enviado para o estabelecimento. O pagamento será realizado na entrega.'
    )
    expect(getCreatedPublicOrderNotice('pending', 'counter')).toBe(
      'Pedido enviado para o estabelecimento. O pagamento será realizado no local.'
    )
    expect(getCreatedPublicOrderNotice('paid', 'online')).toBe(
      'Pagamento confirmado. Pedido enviado para o estabelecimento.'
    )
  })

  it('monta steps do pedido conforme contexto de mesa', () => {
    expect(getOrderSteps({ id: 'table-1', number: '10' }, 'table')[3]).toEqual({
      key: 'ready',
      label: 'Servir',
      description: 'Seu pedido está pronto para servir.',
    })
    expect(getOrderSteps({ id: 'table-1', number: '10' }, 'table')[4]).toEqual({
      key: 'delivered',
      label: 'Servido',
      description: 'Pedido servido na mesa com sucesso.',
    })

    expect(getOrderSteps(null, 'counter')[3]).toEqual({
      key: 'ready',
      label: 'Retirar',
      description: 'Seu pedido está pronto para retirada.',
    })
    expect(getOrderSteps(null, 'counter')[4]).toEqual({
      key: 'delivered',
      label: 'Retirado',
      description: 'Pedido retirado com sucesso.',
    })

    expect(getOrderSteps(null, 'delivery')[3]).toEqual({
      key: 'ready',
      label: 'Despachar',
      description: 'Seu pedido está pronto para sair para entrega.',
    })
    expect(getOrderSteps(null, 'delivery')[4]).toEqual({
      key: 'delivered',
      label: 'Entregue',
      description: 'Pedido entregue com sucesso.',
    })
  })

  it('resume checkout, cancelamento, pagamento e entrega do pedido público', () => {
    const orderSteps = getOrderSteps(null, 'delivery')
    const publicOrderStatus = {
      id: 'order-1',
      order_number: 42,
      status: 'ready',
      payment_status: 'paid',
      payment_method: 'delivery',
      delivery_status: 'out_for_delivery',
      delivery_driver: { name: 'Carlos' },
      cancelled_reason: 'Cliente desistiu',
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    } as const

    expect(getCheckoutStepTitle('cart')).toBe('Seu pedido')
    expect(getCheckoutStepTitle('info')).toBe('Seus dados')
    expect(getCheckoutStepTitle('address')).toBe('Endereço de entrega')
    expect(getCheckoutStepTitle('done')).toBe('Pedido realizado!')
    expect(getPublicOrderCompletionTitle({
      tableInfo: { id: 'table-1', number: '10' },
      paymentMethod: 'table',
    })).toBe('Comanda aberta!')
    expect(getPublicOrderCompletionTitle({
      tableInfo: null,
      paymentMethod: 'counter',
    })).toBe('Pedido pronto para retirada!')
    expect(getPublicOrderCompletionTitle({
      tableInfo: null,
      paymentMethod: 'delivery',
    })).toBe('Pedido realizado!')
    expect(getPublicOrderCompletionSubtitle({
      tableInfo: { id: 'table-1', number: '10' },
      paymentMethod: 'table',
    })).toBe('Acompanhe a comanda da sua mesa.')
    expect(getPublicOrderCompletionSubtitle({
      tableInfo: null,
      paymentMethod: 'counter',
    })).toBe('Use este número para retirar o pedido.')
    expect(getPublicOrderCompletionSubtitle({
      tableInfo: null,
      paymentMethod: 'delivery',
    })).toBe('Acompanhe o andamento do pedido até a entrega.')
    expect(getPublicOrderCompletionCloseLabel({
      tableInfo: { id: 'table-1', number: '10' },
      paymentMethod: 'table',
    })).toBe('Voltar ao cardápio')
    expect(getPublicOrderCompletionCloseLabel({
      tableInfo: null,
      paymentMethod: 'counter',
    })).toBe('Voltar ao cardápio')
    expect(getPublicOrderCompletionCloseLabel({
      tableInfo: null,
      paymentMethod: 'delivery',
    })).toBe('Acompanhar depois')
    expect(getPublicOrderProgressTitle({
      tableInfo: { id: 'table-1', number: '10' },
      paymentMethod: 'table',
    })).toBe('Acompanhe a comanda')
    expect(getPublicOrderProgressTitle({
      tableInfo: null,
      paymentMethod: 'counter',
    })).toBe('Acompanhe a retirada')
    expect(getPublicOrderProgressTitle({
      tableInfo: null,
      paymentMethod: 'delivery',
    })).toBe('Acompanhe o status do pedido')
    expect(getPublicOrderPaymentLabel('table')).toBe('Pagamento no local')
    expect(getPublicOrderPaymentLabel('counter')).toBe('Pagamento na retirada')
    expect(getPublicOrderPaymentLabel('delivery')).toBe('Pagamento na entrega')
    expect(getPublicOrderPaymentLabel('online')).toBe('Pagamento online')
    expect(getPublicOrderReferenceLabel({
      tableInfo: { id: 'table-1', number: '10' },
      paymentMethod: 'table',
    })).toBe('Número da comanda')
    expect(getPublicOrderReferenceLabel({
      tableInfo: null,
      paymentMethod: 'counter',
    })).toBe('Número para retirada')
    expect(getPublicOrderReferenceLabel({
      tableInfo: null,
      paymentMethod: 'delivery',
    })).toBe('Número do pedido')

    expect(getPublicOrderHeadline(publicOrderStatus, orderSteps)).toBe('despachar')
    expect(getPublicOrderHeadline({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'ready',
      delivery_status: null,
    }, getOrderSteps(null, 'counter'))).toBe('pronto para retirada')
    expect(getPublicOrderHeadline({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'ready',
      delivery_status: null,
    }, getOrderSteps({ id: 'table-1', number: '10' }, 'table'))).toBe('pronto para servir')
    expect(getPublicOrderHeadline({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'delivered',
      delivery_status: null,
    }, getOrderSteps({ id: 'table-1', number: '10' }, 'table'))).toBe('servido na mesa')
    expect(getPublicOrderHeadline({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'delivered',
      delivery_status: null,
    }, getOrderSteps(null, 'counter'))).toBe('retirado')
    expect(getCancelledOrderMessage(publicOrderStatus)).toBe('Cliente desistiu')
    expect(getCancelledOrderMessage(null)).toBe('O pedido foi cancelado.')
    expect(getCancelSuccessNotice('refunded')).toContain('reembolso')
    expect(getCancelSuccessNotice('paid')).toBe('Pedido cancelado com sucesso.')
    expect(buildPublicOrderCancelPayload(' Motivo teste ')).toEqual({
      cancelled_reason: 'Motivo teste',
    })
    expect(buildPublicOrderCancelPayload('   ')).toEqual({
      cancelled_reason: 'Cancelado pelo cliente',
    })
    expect(getPaymentStatusLabel('paid')).toBe('Aprovado')
    expect(getPaymentStatusLabel('refunded')).toBe('Reembolsado')
    expect(getPaymentStatusLabel('pending')).toBe('Pendente')
    expect(getPaymentStatusLabel('pending', 'delivery')).toBe('Na entrega')
    expect(getPaymentStatusLabel('pending', 'counter')).toBe('No local')
    expect(getPaymentStatusLabel('pending', 'table')).toBe('No local')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      status: 'confirmed',
      delivery_status: 'waiting_dispatch',
    }, 'confirmado')).toBe('Seu pedido foi confirmado.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      status: 'preparing',
      delivery_status: 'waiting_dispatch',
    }, 'em preparo')).toBe('Seu pedido está em preparo.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      status: 'delivered',
      delivery_status: 'delivered',
    }, 'entregue')).toBe('Seu pedido foi entregue.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'delivered',
      delivery_status: null,
    }, 'entregue')).toBe('Seu pedido foi servido na mesa.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'delivered',
      delivery_status: null,
    }, 'entregue')).toBe('Seu pedido foi retirado.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      status: 'cancelled',
      payment_status: 'pending',
    }, 'cancelado')).toBe('Seu pedido foi cancelado.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      status: 'cancelled',
      payment_status: 'refunded',
    }, 'cancelado')).toBe('Seu pedido foi cancelado e o reembolso foi solicitado.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'ready',
      delivery_status: 'waiting_dispatch',
    }, 'despachar')).toBe('Seu pedido está pronto para sair para entrega.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'ready',
      delivery_status: null,
    }, 'pronto')).toBe('Seu pedido está pronto para retirada.')
    expect(getPublicOrderTrackingMessage({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'ready',
      delivery_status: null,
    }, 'pronto')).toBe('Seu pedido está pronto para servir.')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      status: 'pending',
    })).toBe('Pedido recebido #42')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      status: 'pending',
    })).toBe('Seu pedido entrou na fila do estabelecimento.')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      status: 'preparing',
    })).toBe('Pedido em preparo #42')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'ready',
      delivery_status: null,
    })).toBe('Pedido pronto para retirada #42')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'ready',
      delivery_status: null,
    })).toBe('Pedido pronto para servir #42')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Pedido servido na mesa #42')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Pedido retirado #42')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'ready',
      delivery_status: 'waiting_dispatch',
    })).toBe('Pedido pronto para entrega #42')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'delivered',
      delivery_status: 'delivered',
    })).toBe('Pedido entregue #42')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'ready',
      delivery_status: null,
    })).toBe('Seu pedido está aguardando retirada.')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'ready',
      delivery_status: null,
    })).toBe('Seu pedido está pronto para servir.')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Seu pedido foi retirado.')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Seu pedido foi servido na mesa.')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'ready',
      delivery_status: 'waiting_dispatch',
    })).toBe('Seu pedido está pronto para sair para entrega.')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'delivered',
      delivery_status: 'delivered',
    })).toBe('Seu pedido foi entregue.')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      status: 'preparing',
    })).toBe('Seu pedido está sendo preparado.')
    expect(getPublicOrderStatusCardTitle({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })).toBe('Pedido saiu para entrega #42')
    expect(getPublicOrderStatusCardMessage({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })).toBe('Acompanhe o deslocamento da entrega.')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })).toBe('Ver entrega')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'ready',
      delivery_status: 'waiting_dispatch',
    })).toBe('Ver entrega')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      payment_method: 'delivery',
      status: 'delivered',
      delivery_status: 'delivered',
    })).toBe('Ver entrega')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'ready',
      delivery_status: null,
    })).toBe('Ver retirada')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Ver retirada')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'ready',
      delivery_status: null,
    })).toBe('Ver comanda')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Ver comanda')
    expect(getPublicOrderStatusCardActionLabel({
      ...publicOrderStatus,
      status: 'preparing',
    })).toBe('Ver pedido')
    expect(getPublicOrderStatusCardTone({
      ...publicOrderStatus,
      status: 'pending',
      delivery_status: 'waiting_dispatch',
    })).toBe('warning')
    expect(getPublicOrderStatusCardTone({
      ...publicOrderStatus,
      status: 'preparing',
      delivery_status: 'waiting_dispatch',
    })).toBe('progress')
    expect(getPublicOrderStatusCardTone({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })).toBe('delivery')
    expect(getPublicOrderStatusCardTone({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'waiting_dispatch',
    })).toBe('delivery')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'confirmed',
      delivery_status: 'waiting_dispatch',
    })).toBe('Seu pedido foi confirmado pelo estabelecimento.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'preparing',
      delivery_status: 'waiting_dispatch',
    })).toBe('Seu pedido está em preparo.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'waiting_dispatch',
    })).toBe('Seu pedido está pronto para sair para entrega.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'ready',
      delivery_status: null,
    })).toBe('Seu pedido está pronto para retirada.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'ready',
      delivery_status: null,
    })).toBe('Seu pedido está pronto para servir.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      payment_method: 'table',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Pedido servido na mesa com sucesso.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      payment_method: 'counter',
      status: 'delivered',
      delivery_status: null,
    })).toBe('Pedido retirado com sucesso.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'delivered',
      delivery_status: 'delivered',
    })).toBe('Pedido entregue com sucesso.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'ready',
      delivery_status: 'out_for_delivery',
    })).toBe('Seu pedido saiu para entrega.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'cancelled',
      payment_status: 'pending',
    })).toBe('Pedido cancelado.')
    expect(getPublicOrderStatusNotice({
      ...publicOrderStatus,
      status: 'cancelled',
      payment_status: 'refunded',
    })).toBe('Pedido cancelado e reembolso solicitado com sucesso.')
    expect(getOnlineCheckoutErrorMessage(new Error('mp error'))).toBe('mp error')
    expect(getOnlineCheckoutErrorMessage(null)).toBe('Erro ao iniciar pagamento online.')
    expect(getPublicOrderPlacementErrorMessage(new Error('order error'))).toBe('order error')
    expect(getPublicOrderPlacementErrorMessage(null)).toBe('Erro ao fazer pedido.')
    expect(getCancelOrderErrorMessage(new Error('cancel error'))).toBe('cancel error')
    expect(getCancelOrderErrorMessage(null)).toBe('Erro ao cancelar pedido.')
    expect(shouldShowCancelOrderButton('pending')).toBe(true)
    expect(shouldShowCancelOrderButton('confirmed')).toBe(true)
    expect(shouldShowCancelOrderButton(undefined)).toBe(false)
    expect(shouldShowCancelOrderButton('ready')).toBe(false)
    expect(shouldShowDeliveryStep(publicOrderStatus)).toBe(true)
    expect(shouldShowPublicDeliveryConfirmButton(publicOrderStatus)).toBe(true)
    expect(shouldShowPublicDeliveryConfirmButton({
      ...publicOrderStatus,
      delivery_status: 'waiting_dispatch',
    })).toBe(false)
    expect(shouldShowPublicDeliveryConfirmButton({
      ...publicOrderStatus,
      status: 'delivered',
    })).toBe(false)
    expect(getCheckoutNoticeTone(publicOrderStatus)).toBe('info')
    expect(getCheckoutNoticeTone({
      ...publicOrderStatus,
      status: 'cancelled',
    })).toBe('danger')
    expect(getCheckoutNoticeTone({
      ...publicOrderStatus,
      status: 'delivered',
    })).toBe('success')
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Seu pedido está em preparo.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'preparing',
      },
      cartOpen: false,
    })).toBe(false)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pagamento pendente.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'preparing',
      },
      cartOpen: false,
    })).toBe(true)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Seu pedido está pronto para sair para entrega.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'ready',
        payment_method: 'delivery',
        delivery_status: 'waiting_dispatch',
      },
      cartOpen: false,
    })).toBe(false)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Seu pedido saiu para entrega.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'ready',
        payment_method: 'delivery',
        delivery_status: 'out_for_delivery',
      },
      cartOpen: false,
    })).toBe(false)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Seu pedido está pronto para retirada.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'ready',
        payment_method: 'counter',
        delivery_status: null,
      },
      cartOpen: false,
    })).toBe(false)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Seu pedido está pronto para servir.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'ready',
        payment_method: 'table',
        delivery_status: null,
      },
      cartOpen: false,
    })).toBe(false)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pedido cancelado.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'cancelled',
      },
      cartOpen: false,
    })).toBe(true)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pedido entregue com sucesso.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'delivered',
        payment_method: 'delivery',
        delivery_status: 'delivered',
      },
      cartOpen: false,
    })).toBe(true)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pedido retirado com sucesso.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'delivered',
        payment_method: 'counter',
        delivery_status: null,
      },
      cartOpen: false,
    })).toBe(true)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pedido servido na mesa com sucesso.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'delivered',
        payment_method: 'table',
        delivery_status: null,
      },
      cartOpen: false,
    })).toBe(true)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pedido cancelado e reembolso solicitado com sucesso.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'cancelled',
        payment_status: 'refunded',
      },
      cartOpen: false,
    })).toBe(true)
    expect(shouldShowCheckoutNoticeBanner({
      checkoutNotice: 'Pedido cancelado.',
      publicOrderStatus: {
        ...publicOrderStatus,
        status: 'cancelled',
        payment_status: 'pending',
      },
      cartOpen: false,
    })).toBe(true)
    expect(isDeliveryStepCompleted(publicOrderStatus)).toBe(true)
    expect(getDeliveryStepMessage(publicOrderStatus)).toContain('com Carlos')
    expect(getDeliveryStepMessage({
      ...publicOrderStatus,
      delivery_status: 'assigned',
    })).toContain('vai aparecer aqui')
    expect(
      getValidationErrorToastMessage({
        name: 'Nome obrigatório',
        phone: 'Telefone inválido',
      })
    ).toBe('Confira os campos obrigatórios: Nome obrigatório, Telefone inválido')
  })

  it('monta payloads e decide o fluxo do checkout público', () => {
    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Pizza',
      description: null,
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [],
    }

    const cart = [
      {
        menu_item_id: 'item-1',
        name: 'Pizza',
        price: 30,
        quantity: 2,
        extras: [{ name: 'Borda', price: 5 }],
      },
    ]

    expect(getContinueFlowTarget('online', { id: 'table-1', number: '10' })).toBe('online-checkout')
    expect(getContinueFlowTarget('counter', null)).toBe('address')
    expect(getContinueFlowTarget('counter', { id: 'table-1', number: '10' })).toBe('place-order')
    expect(getAddressFlowTarget('online')).toBe('online-checkout')
    expect(getAddressFlowTarget('delivery')).toBe('place-order')

    expect(buildPublicCheckoutPayload({
      tenantId: 'tenant-1',
      tenantSlug: 'chefops',
      customerName: 'Maria',
      phone: '(11) 99999-9999',
      customerCpf: '123.456.789-09',
      tableInfo: { id: 'table-1', number: '10' },
      notes: 'Sem cebola',
      deliveryFee: 8,
      deliveryAddress: {
        zip_code: '12345678',
        street: 'Rua A',
        number: '10',
        city: 'Sao Paulo',
        state: 'SP',
        label: 'Casa',
        is_default: false,
      },
      items: cart,
    })).toMatchObject({
      tenant_id: 'tenant-1',
      tenant_slug: 'chefops',
      customer_phone: '11999999999',
      customer_cpf: '123.456.789-09',
      table_number: '10',
      delivery_fee: 8,
    })

    expect(buildPublicCheckoutPayload({
      tenantId: 'tenant-1',
      tenantSlug: 'chefops',
      customerName: 'Maria',
      phone: '',
      customerCpf: '',
      tableInfo: null,
      notes: '',
      deliveryFee: 0,
      items: cart,
    })).toMatchObject({
      customer_phone: undefined,
      customer_cpf: undefined,
      notes: undefined,
      table_number: undefined,
    })

    expect(buildPublicOrderPayload({
      tenantId: 'tenant-1',
      customerName: 'Maria',
      customerCpf: '',
      phone: '(11) 99999-9999',
      customerId: 'customer-1',
      tableInfo: null,
      paymentMethod: 'delivery',
      notes: '',
      deliveryFee: 8,
      deliveryAddress: {},
      items: cart,
    })).toMatchObject({
      tenant_id: 'tenant-1',
      customer_phone: '11999999999',
      customer_id: 'customer-1',
      payment_method: 'delivery',
      delivery_address: undefined,
    })

    expect(buildPublicOrderPayload({
      tenantId: 'tenant-1',
      customerName: 'Maria',
      customerCpf: '',
      phone: '',
      tableInfo: { id: 'table-1', number: '10' },
      paymentMethod: 'table',
      notes: '',
      deliveryFee: 0,
      items: cart,
    })).toMatchObject({
      customer_phone: undefined,
      table_number: '10',
      payment_method: 'table',
      notes: undefined,
    })

    expect(resolvePublicCheckoutUrl({ checkout_url: 'https://checkout.test' })).toBe('https://checkout.test')
    expect(resolvePublicCheckoutUrl({ sandbox_init_point: 'https://sandbox.test' })).toBe('https://sandbox.test')
    expect(resolvePublicCheckoutUrl({ init_point: 'https://init.test' })).toBe('https://init.test')
    expect(resolvePublicCheckoutUrl(null)).toBeNull()

    expect(getHalfFlavorOptions([
      item,
      { ...item, id: 'item-2', name: 'Calabresa' },
      { ...item, id: 'item-3', category: { id: 'cat-2', name: 'Massas' } },
    ], item)).toMatchObject([{ id: 'item-2', name: 'Calabresa' }])
    expect(getHalfFlavorOptions([
      item,
      { ...item, id: 'item-4', category: null },
    ], item)).toEqual([])

    expect(getCartItemLineTotal(cart[0])).toBe(70)
    expect(getCartItemLineTotal({
      menu_item_id: 'item-9',
      name: 'Água',
      price: 4,
      quantity: 2,
    })).toBe(8)
    expect(getCustomerBannerState(true, { id: 'customer-1' }, false)).toBe('existing')
    expect(getCustomerBannerState(true, null, true)).toBe('new')
    expect(getCustomerBannerState(false, null, true)).toBeNull()
    expect(shouldRequirePhoneVerification(true, null)).toBe(true)
    expect(shouldRequirePhoneVerification(true, { id: 'table-1', number: '7' })).toBe(false)
    expect(shouldRequirePhoneVerification(false, null)).toBe(false)
    expect(getInfoContinueLabel(true)).toBe('Processando...')
    expect(getInfoContinueLabel(false)).toBe('Continuar')
    expect(getAddressSubmitLabel('online', false)).toBe('Ir para pagamento')
    expect(getAddressSubmitLabel('delivery', false)).toBe('Fazer pedido')
  })

  it('resume estado da busca de cliente no checkout público', () => {
    expect(getLookupCustomerFoundState({
      id: 'cust-1',
      name: 'Maria',
      phone: '11999999999',
    })).toEqual({
      existingCustomer: {
        id: 'cust-1',
        name: 'Maria',
        phone: '11999999999',
      },
      customerName: 'Maria',
      isNewCustomer: false,
      phoneVerified: true,
    })

    expect(getLookupCustomerMissingState()).toEqual({
      existingCustomer: null,
      customerName: '',
      isNewCustomer: true,
      phoneVerified: true,
    })
  })
})

describe('public menu smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notFoundMock.mockImplementation(() => {
      throw new Error('not-found')
    })

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'tenant-1',
              name: 'ChefOps House',
              slug: 'chefops-house',
              plan: 'pro',
              tenant_delivery_settings: [{ delivery_enabled: true, flat_fee: 8 }],
            },
          }),
        }
      }

      if (table === 'menu_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn()
            .mockReturnThis()
            .mockImplementationOnce(function () { return this })
            .mockResolvedValueOnce({
              data: [
                {
                  id: 'item-1',
                  tenant_id: 'tenant-1',
                  category_id: 'cat-1',
                  name: 'Pizza',
                  description: 'Grande',
                  price: 30,
                  image_url: null,
                  available: true,
                  display_order: 1,
                  created_at: '2026-03-21T00:00:00.000Z',
                  updated_at: '2026-03-21T00:00:00.000Z',
                  category: [{ id: 'cat-1', name: 'Pizzas' }],
                  extras: [{ extra: [{ id: 'extra-1', name: 'Catupiry', price: 5, category: 'border' }] }],
                },
              ],
            }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { table_id: 'table-1', table: { id: 'table-1', number: '10' } },
        }),
      }
    })
  })

  it('renderiza MenuClient com cardapio e checkout drawer fechado', async () => {
    const { default: MenuClient } = await import('@/app/[slug]/menu/MenuClient')

    const markup = renderToStaticMarkup(
      React.createElement(MenuClient, {
        tenant: {
          id: 'tenant-1',
          name: 'ChefOps House',
          slug: 'chefops-house',
          plan: 'pro',
          delivery_settings: { delivery_enabled: true, flat_fee: 8 },
        },
        items: [
          {
            id: 'item-1',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            name: 'Pizza',
            description: 'Grande',
            price: 30,
            available: true,
            display_order: 1,
            category: { id: 'cat-1', name: 'Pizzas' },
            extras: [{ extra: { id: 'extra-1', name: 'Catupiry', price: 5, category: 'border' } }],
          },
        ],
        tableInfo: { id: 'table-1', number: '10' },
        checkoutSessionId: null,
        checkoutResult: null,
      }),
    )

    expect(markup).toContain('ChefOps House')
    expect(markup).toContain('Carrinho')
    expect(markup).toContain('Pizza')
    expect(markup).toContain('Mesa 10')
  }, 20000)

  it('renderiza MenuPage com dados normalizados do supabase', async () => {
    const { default: MenuPage } = await import('@/app/[slug]/menu/page')

    const element = await MenuPage({
      params: Promise.resolve({ slug: 'chefops-house' }),
      searchParams: Promise.resolve({
        table: 'table-token',
        checkout_session: 'chk-1',
        checkout_result: 'success',
      }),
    })

    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('ChefOps House')
    expect(markup).toContain('Pizza')
    expect(markup).toContain('Mesa 10')
  }, 15000)

  it('usa a primeira mesa quando o join do qrcode retorna array', async () => {
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'tenant-1',
              name: 'ChefOps House',
              slug: 'chefops-house',
              plan: 'pro',
              tenant_delivery_settings: [{ delivery_enabled: true, flat_fee: 8 }],
            },
          }),
        }
      }

      if (table === 'menu_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn()
            .mockReturnThis()
            .mockImplementationOnce(function () { return this })
            .mockResolvedValueOnce({ data: [] }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { table_id: 'table-1', table: [{ id: 'table-1', number: '12' }] },
        }),
      }
    })

    const { default: MenuPage } = await import('@/app/[slug]/menu/page')

    const element = await MenuPage({
      params: Promise.resolve({ slug: 'chefops-house' }),
      searchParams: Promise.resolve({ table: 'table-token' }),
    })

    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('Mesa 12')
  })

  it('renderiza sem itens quando o select do cardapio retorna null', async () => {
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'tenant-1',
              name: 'ChefOps House',
              slug: 'chefops-house',
              plan: 'pro',
              tenant_delivery_settings: [{ delivery_enabled: true, flat_fee: 8 }],
            },
          }),
        }
      }

      if (table === 'menu_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn()
            .mockReturnThis()
            .mockImplementationOnce(function () { return this })
            .mockResolvedValueOnce({ data: null }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    const { default: MenuPage } = await import('@/app/[slug]/menu/page')

    const element = await MenuPage({
      params: Promise.resolve({ slug: 'chefops-house' }),
      searchParams: Promise.resolve({}),
    })

    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('ChefOps House')
    expect(markup).not.toContain('Pizza')
    expect(markup).not.toContain('Mesa ')
  })

  it('ignora mesa quando o qrcode existe mas o join vem sem table', async () => {
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'tenant-1',
              name: 'ChefOps House',
              slug: 'chefops-house',
              plan: 'pro',
              tenant_delivery_settings: [{ delivery_enabled: true, flat_fee: 8 }],
            },
          }),
        }
      }

      if (table === 'menu_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn()
            .mockReturnThis()
            .mockImplementationOnce(function () { return this })
            .mockResolvedValueOnce({ data: [] }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { table_id: 'table-1', table: null },
        }),
      }
    })

    const { default: MenuPage } = await import('@/app/[slug]/menu/page')

    const element = await MenuPage({
      params: Promise.resolve({ slug: 'chefops-house' }),
      searchParams: Promise.resolve({ table: 'table-token' }),
    })

    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('ChefOps House')
    expect(markup).not.toContain('Mesa ')
  })

  it('aciona notFound quando o tenant publico nao existe', async () => {
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      }
    })

    const { default: MenuPage } = await import('@/app/[slug]/menu/page')

    await expect(
      MenuPage({
        params: Promise.resolve({ slug: 'missing-tenant' }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('not-found')

    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })
})
