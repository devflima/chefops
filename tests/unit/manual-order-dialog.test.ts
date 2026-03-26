import { describe, expect, it } from 'vitest'

import {
  addManualOrderItem,
  buildManualOrderPayload,
  buildManualOrderTabPayload,
  changeManualOrderItemQuantity,
  getAvailableManualOrderItems,
  getManualOrderCreateTabErrorState,
  getManualOrderCreateTabSuccessState,
  getManualOrderCreateTabValidationState,
  getManualOrderErrorMessage,
  getInitialManualOrderFormState,
  getManualOrderAddItemState,
  getManualOrderModeChangeState,
  getManualOrderResetState,
  getManualOrderSelectedItemToAdd,
  getManualOrderSelectedItemSuccessState,
  getManualOrderSubmitErrorState,
  getManualOrderSubmitValidationState,
  getManualOrderSubmitSuccessState,
  getManualOrderSummaryLabel,
  getManualOrderTotal,
  isManualOrderSubmitting,
  groupManualOrderItems,
  orderManualOrderGroups,
  removeManualOrderItem,
  validateNewManualTabLabel,
  validateManualOrderSubmission,
} from '@/features/orders/manual-order-dialog'

describe('manual order dialog helpers', () => {
  it('filtra, agrupa e ordena itens disponíveis', () => {
    const available = getAvailableManualOrderItems([
      { id: '1', name: 'Pizza', price: 30, available: true, category: { id: 'c2', name: 'Pizzas' } },
      { id: '2', name: 'Suco', price: 8, available: false, category: { id: 'c1', name: 'Bebidas' } },
      { id: '3', name: 'Agua', price: 5, available: true, category: { id: 'c1', name: 'Bebidas' } },
    ])

    expect(available).toHaveLength(2)

    const grouped = groupManualOrderItems(available)
    expect(grouped.c1.label).toBe('Bebidas')
    expect(grouped.c2.items[0].name).toBe('Pizza')

    const ordered = orderManualOrderGroups(grouped)
    expect(ordered.map(([key]) => key)).toEqual(['c1', 'c2'])

    const groupedWithFallback = groupManualOrderItems([
      { id: '4', name: 'Brownie', price: 12, available: true, category: null },
      { id: '5', name: 'Coca', price: 7, available: true, category: { id: 'c1', name: 'Bebidas' } },
      { id: '6', name: 'Suco de uva', price: 9, available: true, category: { id: 'c1', name: 'Bebidas' } },
    ])

    expect(groupedWithFallback['sem-categoria'].label).toBe('Sem categoria')
    expect(groupedWithFallback.c1.items).toHaveLength(2)
  })

  it('controla mutações de carrinho e total', () => {
    const item = { id: '1', name: 'Pizza', price: 30, available: true, category: null }
    const withItem = addManualOrderItem([], item)
    expect(withItem).toEqual([{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 }])

    const incremented = addManualOrderItem(withItem, item)
    expect(incremented[0].quantity).toBe(2)

    expect(
      addManualOrderItem(
        [
          { menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 },
          { menu_item_id: '2', name: 'Suco', price: 8, quantity: 3 },
        ],
        item,
      ),
    ).toEqual([
      { menu_item_id: '1', name: 'Pizza', price: 30, quantity: 2 },
      { menu_item_id: '2', name: 'Suco', price: 8, quantity: 3 },
    ])

    const changed = changeManualOrderItemQuantity(incremented, '1', -1)
    expect(changed[0].quantity).toBe(1)

    expect(
      changeManualOrderItemQuantity(
        [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 2 }],
        'menu-inexistente',
        -1,
      ),
    ).toEqual([{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 2 }])

    expect(changeManualOrderItemQuantity(changed, '1', -1)).toEqual([])
    expect(removeManualOrderItem([{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 }], '1')).toEqual([])
    expect(getManualOrderTotal([{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 2 }])).toBe(60)
  })

  it('gera resumo, valida submissão e normaliza erro', () => {
    expect(getManualOrderSummaryLabel('counter', null, null)).toBe('Pedido de balcao')
    expect(getManualOrderSummaryLabel('table', { id: 't1', number: '10', capacity: 4, active: true } as never, null))
      .toBe('Vinculado a Mesa 10')
    expect(getManualOrderSummaryLabel('tab', null, { id: 'tab-1', label: 'C-1', status: 'open' } as never))
      .toBe('Vinculado a comanda C-1')
    expect(getManualOrderSummaryLabel('tab', null, null)).toBe('Selecione uma comanda')

    expect(validateManualOrderSubmission({
      tenantId: '',
      cart: [],
      orderMode: 'counter',
      selectedTable: null,
      selectedTabId: '',
    })).toContain('estabelecimento')

    expect(validateManualOrderSubmission({
      tenantId: 'tenant-1',
      cart: [],
      orderMode: 'counter',
      selectedTable: null,
      selectedTabId: '',
    })).toContain('Adicione ao menos um item')

    expect(validateManualOrderSubmission({
      tenantId: 'tenant-1',
      cart: [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 }],
      orderMode: 'table',
      selectedTable: null,
      selectedTabId: '',
    })).toContain('Selecione uma mesa')

    expect(validateManualOrderSubmission({
      tenantId: 'tenant-1',
      cart: [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 }],
      orderMode: 'tab',
      selectedTable: null,
      selectedTabId: '',
    })).toContain('Selecione ou crie uma comanda')

    expect(validateManualOrderSubmission({
      tenantId: 'tenant-1',
      cart: [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 }],
      orderMode: 'counter',
      selectedTable: null,
      selectedTabId: '',
    })).toBe('')

    expect(getManualOrderErrorMessage(new Error('boom'))).toBe('boom')
    expect(getManualOrderErrorMessage('x')).toBe('Erro ao criar pedido.')
  })

  it('prepara troca de modo, criação de comanda e payload do pedido manual', () => {
    expect(getInitialManualOrderFormState()).toEqual({
      orderMode: 'counter',
      selectedTableId: '',
      selectedTabId: '',
      newTabLabel: '',
      customerName: '',
      customerPhone: '',
      notes: '',
      cart: [],
      selectedMenuItemId: '',
      errorMessage: '',
    })

    expect(getManualOrderModeChangeState('table')).toEqual({
      orderMode: 'table',
      selectedTableId: '',
      selectedTabId: '',
    })

    expect(getManualOrderResetState()).toEqual(getInitialManualOrderFormState())

    expect(validateNewManualTabLabel('   ')).toBe('Informe um identificador para criar a comanda.')
    expect(validateNewManualTabLabel('C-10')).toBe('')
    expect(getManualOrderCreateTabValidationState('   ')).toEqual({
      shouldCreate: false,
      errorMessage: 'Informe um identificador para criar a comanda.',
    })
    expect(getManualOrderCreateTabValidationState('C-10')).toEqual({
      shouldCreate: true,
      errorMessage: '',
    })
    expect(buildManualOrderTabPayload(' Balcao 7 ')).toEqual({ label: 'Balcao 7' })
    expect(getManualOrderCreateTabSuccessState('tab-10')).toEqual({
      selectedTabId: 'tab-10',
      newTabLabel: '',
      errorMessage: '',
    })
    expect(getManualOrderCreateTabErrorState(new Error('tab failed'))).toEqual({
      errorMessage: 'tab failed',
    })
    expect(isManualOrderSubmitting({
      createOrderPending: false,
      createTabPending: false,
      menuLoading: false,
    })).toBe(false)
    expect(isManualOrderSubmitting({
      createOrderPending: true,
      createTabPending: false,
      menuLoading: false,
    })).toBe(true)

    expect(getManualOrderSelectedItemToAdd([
      { id: 'menu-1', name: 'Pizza', price: 30, available: true, category: null },
    ], '')).toEqual({
      item: undefined,
      errorMessage: 'Selecione um item do cardápio para adicionar.',
    })
    expect(getManualOrderSelectedItemToAdd([
      { id: 'menu-1', name: 'Pizza', price: 30, available: true, category: null },
    ], 'menu-1')).toEqual({
      item: { id: 'menu-1', name: 'Pizza', price: 30, available: true, category: null },
      errorMessage: '',
    })
    expect(getManualOrderSelectedItemSuccessState(
      [{ menu_item_id: 'menu-1', name: 'Pizza', price: 30, quantity: 1 }],
      { id: 'menu-1', name: 'Pizza', price: 30, available: true, category: null },
    )).toEqual({
      cart: [{ menu_item_id: 'menu-1', name: 'Pizza', price: 30, quantity: 2 }],
      selectedMenuItemId: '',
      errorMessage: '',
    })
    expect(getManualOrderAddItemState([
      { id: 'menu-1', name: 'Pizza', price: 30, available: true, category: null },
    ], '', [])).toEqual({
      cart: [],
      selectedMenuItemId: '',
      errorMessage: 'Selecione um item do cardápio para adicionar.',
      shouldAdd: false,
    })
    expect(getManualOrderAddItemState([
      { id: 'menu-1', name: 'Pizza', price: 30, available: true, category: null },
    ], 'menu-1', [])).toEqual({
      cart: [{ menu_item_id: 'menu-1', name: 'Pizza', price: 30, quantity: 1 }],
      selectedMenuItemId: '',
      errorMessage: '',
      shouldAdd: true,
    })

    expect(buildManualOrderPayload({
      tenantId: 'tenant-1',
      customerName: ' Maria ',
      customerPhone: '(11) 99999-9999',
      orderMode: 'table',
      selectedTable: { id: 'table-1', number: '8', capacity: 4, active: true } as never,
      selectedTabId: '',
      notes: ' Sem cebola ',
      cart: [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 2 }],
    })).toEqual({
      tenant_id: 'tenant-1',
      customer_name: 'Maria',
      customer_phone: '11999999999',
      table_id: 'table-1',
      table_number: '8',
      tab_id: undefined,
      payment_method: 'table',
      notes: 'Sem cebola',
      items: [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 2 }],
    })

    expect(buildManualOrderPayload({
      tenantId: 'tenant-1',
      customerName: '',
      customerPhone: '',
      orderMode: 'tab',
      selectedTable: null,
      selectedTabId: 'tab-9',
      notes: '',
      cart: [{ menu_item_id: '2', name: 'Suco', price: 8, quantity: 1 }],
    })).toEqual({
      tenant_id: 'tenant-1',
      customer_name: undefined,
      customer_phone: undefined,
      table_id: undefined,
      table_number: undefined,
      tab_id: 'tab-9',
      payment_method: 'counter',
      notes: undefined,
      items: [{ menu_item_id: '2', name: 'Suco', price: 8, quantity: 1 }],
    })

    expect(getManualOrderSubmitSuccessState()).toEqual({
      shouldClose: true,
      errorMessage: '',
    })
    expect(getManualOrderSubmitValidationState({
      tenantId: '',
      cart: [],
      orderMode: 'counter',
      selectedTable: null,
      selectedTabId: '',
    })).toEqual({
      shouldSubmit: false,
      errorMessage: 'Não foi possível identificar o estabelecimento atual.',
    })
    expect(getManualOrderSubmitValidationState({
      tenantId: 'tenant-1',
      cart: [{ menu_item_id: '1', name: 'Pizza', price: 30, quantity: 1 }],
      orderMode: 'counter',
      selectedTable: null,
      selectedTabId: '',
    })).toEqual({
      shouldSubmit: true,
      errorMessage: '',
    })
    expect(getManualOrderSubmitErrorState(new Error('submit failed'))).toEqual({
      errorMessage: 'submit failed',
    })
  })
})
