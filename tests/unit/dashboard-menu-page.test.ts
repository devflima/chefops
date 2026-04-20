import { describe, expect, it } from 'vitest'

import {
  addMenuIngredient,
  buildMenuAvailabilityState,
  buildMenuAvailabilityRequest,
  buildCreateMenuItemPayload,
  buildMenuPageSummary,
  buildUpdateMenuItemPayload,
  filterMenuItems,
  getPersistedMenuExtraIds,
  getCreateMenuEditorState,
  getMenuDialogTitle,
  getMenuEditState,
  getMenuFilterChangeState,
  getMenuExtraCategoryLabel,
  getMenuSubmitErrorMessage,
  getInitialMenuItemFormValues,
  getSelectableMenuExtras,
  groupMenuExtrasByCategory,
  getMenuSubmitSuccessState,
  getMenuTotalPages,
  getNormalizedIngredients,
  paginateMenuItems,
  removeMenuIngredient,
  toggleMenuExtraSelection,
  updateMenuIngredient,
} from '@/features/menu/dashboard-menu-page'

describe('dashboard menu page helpers', () => {
  const items = [
    { id: '1', category_id: 'cat-1', available: true },
    { id: '2', category_id: 'cat-2', available: false },
    { id: '3', category_id: 'cat-1', available: true },
  ] as never

  it('filtra, pagina e resume itens do cardapio', () => {
    expect(filterMenuItems(items, 'available', 'all').map((item) => item.id)).toEqual(['1', '3'])
    expect(filterMenuItems(items, 'inactive', 'cat-2').map((item) => item.id)).toEqual(['2'])
    expect(filterMenuItems(items, 'all', 'cat-1').map((item) => item.id)).toEqual(['1', '3'])
    expect(paginateMenuItems(items, 2, 2).map((item) => item.id)).toEqual(['3'])
    expect(buildMenuPageSummary(items, { resource_limits: { menu_items: 10 } } as never)).toEqual({
      availableCount: 2,
      inactiveCount: 1,
      menuItemCount: 3,
      limitLabel: '3/10 no plano',
    })
    expect(buildMenuPageSummary(items, { resource_limits: { menu_items: -1 } } as never)).toEqual({
      availableCount: 2,
      inactiveCount: 1,
      menuItemCount: 3,
      limitLabel: '',
    })
    expect(buildMenuPageSummary(undefined, null)).toEqual({
      availableCount: 0,
      inactiveCount: 0,
      menuItemCount: 0,
      limitLabel: '0/undefined no plano',
    })
  })

  it('monta payload e normaliza ingredientes', () => {
    expect(getInitialMenuItemFormValues()).toEqual({
      name: '',
      description: '',
      category_id: 'none',
      price: 0,
      display_order: 0,
    })

    expect(buildCreateMenuItemPayload(
      { name: 'Pizza', description: 'Grande', price: 30, category_id: 'cat-1', display_order: 1 },
      true,
      'prod-1',
    )).toEqual({
      name: 'Pizza',
      description: 'Grande',
      price: 30,
      category_id: 'cat-1',
      display_order: 1,
      product_id: 'prod-1',
    })

    expect(buildCreateMenuItemPayload(
      { name: 'Pizza', description: 'Grande', price: 30, category_id: 'cat-1', display_order: 1 },
      false,
      'prod-1',
    )).toEqual({
      name: 'Pizza',
      description: 'Grande',
      price: 30,
      category_id: 'cat-1',
      display_order: 1,
    })

    expect(buildCreateMenuItemPayload(
      { name: 'Pizza', description: 'Grande', price: 30, category_id: 'none', display_order: 1 },
      true,
      'none',
    )).toEqual({
      name: 'Pizza',
      description: 'Grande',
      price: 30,
      display_order: 1,
    })

    expect(buildUpdateMenuItemPayload(
      { name: 'Pizza', description: '', price: 30, category_id: 'none', display_order: 1 },
      true,
      'none',
    )).toEqual({
      name: 'Pizza',
      description: undefined,
      price: 30,
      category_id: null,
      display_order: 1,
      product_id: null,
    })

    expect(getNormalizedIngredients([
      { product_id: 'prod-1', quantity: 1 },
      { product_id: 'none', quantity: 2 },
    ])).toEqual([{ product_id: 'prod-1', quantity: 1 }])
  })

  it('monta estados do editor de item do cardapio', () => {
    expect(getMenuDialogTitle(null)).toBe('Novo item do cardápio')
    expect(getMenuDialogTitle({ id: 'item-1' } as never)).toBe('Editar item')

    expect(getCreateMenuEditorState()).toEqual({
      editing: null,
      formValues: {
        name: '',
        description: '',
        category_id: 'none',
        price: 0,
        display_order: 0,
      },
      linkedProductId: 'none',
      ingredients: [],
      selectedExtras: [],
    })

    expect(getMenuEditState({
      item: {
        id: 'item-1',
        name: 'Pizza',
        description: null,
        price: 42,
        category_id: 'cat-1',
        display_order: 3,
        product_id: 'prod-1',
      } as never,
      selectedExtras: [{ id: 'extra-1' }, { id: 'extra-2' }],
      ingredients: [{ product_id: 'prod-2', quantity: '1.5' as never }],
      hasStockAutomation: true,
    })).toEqual({
      editing: {
        id: 'item-1',
        name: 'Pizza',
        description: null,
        price: 42,
        category_id: 'cat-1',
        display_order: 3,
        product_id: 'prod-1',
      },
      formValues: {
        name: 'Pizza',
        description: '',
        price: 42,
        category_id: 'cat-1',
        display_order: 3,
      },
      selectedExtras: ['extra-1', 'extra-2'],
      ingredients: [{ product_id: 'prod-2', quantity: 1.5 }],
      linkedProductId: 'prod-1',
    })

    expect(getMenuEditState({
      item: {
        id: 'item-2',
        name: 'Suco',
        description: 'Gelado',
        price: 12,
        category_id: null,
        display_order: 1,
        product_id: 'prod-3',
      } as never,
      selectedExtras: null,
      ingredients: [{ product_id: 'prod-4', quantity: 2 }],
      hasStockAutomation: false,
    })).toEqual({
      editing: {
        id: 'item-2',
        name: 'Suco',
        description: 'Gelado',
        price: 12,
        category_id: null,
        display_order: 1,
        product_id: 'prod-3',
      },
      formValues: {
        name: 'Suco',
        description: 'Gelado',
        price: 12,
        category_id: 'none',
        display_order: 1,
      },
      selectedExtras: [],
      ingredients: [],
      linkedProductId: 'none',
    })

    expect(getMenuEditState({
      item: {
        id: 'item-3',
        name: 'Agua',
        description: null,
        price: 5,
        category_id: null,
        display_order: 4,
        product_id: null,
      } as never,
      selectedExtras: undefined,
      ingredients: null,
      hasStockAutomation: true,
    })).toEqual({
      editing: {
        id: 'item-3',
        name: 'Agua',
        description: null,
        price: 5,
        category_id: null,
        display_order: 4,
        product_id: null,
      },
      formValues: {
        name: 'Agua',
        description: '',
        price: 5,
        category_id: 'none',
        display_order: 4,
      },
      selectedExtras: [],
      ingredients: [],
      linkedProductId: 'none',
    })

    expect(getMenuSubmitSuccessState()).toEqual({
      open: false,
      formValues: {
        name: '',
        description: '',
        category_id: 'none',
        price: 0,
        display_order: 0,
      },
      selectedExtras: [],
      ingredients: [],
      linkedProductId: 'none',
    })

    expect(getMenuTotalPages(0, 10)).toBe(1)
    expect(getMenuTotalPages(21, 10)).toBe(3)
    expect(getMenuFilterChangeState('cat-1')).toEqual({ value: 'cat-1', page: 1 })
    expect(getMenuSubmitErrorMessage(new Error('boom'))).toBe('boom')
    expect(getMenuSubmitErrorMessage(null)).toBe('Erro ao salvar item.')
  })

  it('manipula ingredientes, extras e toggle de disponibilidade', () => {
    expect(addMenuIngredient([])).toEqual([{ product_id: 'none', quantity: 1 }])
    expect(updateMenuIngredient(
      [{ product_id: 'prod-1', quantity: 1 }, { product_id: 'prod-2', quantity: 2 }],
      1,
      { quantity: 3 }
    )).toEqual([
      { product_id: 'prod-1', quantity: 1 },
      { product_id: 'prod-2', quantity: 3 },
    ])
    expect(removeMenuIngredient(
      [{ product_id: 'prod-1', quantity: 1 }, { product_id: 'prod-2', quantity: 2 }],
      0
    )).toEqual([{ product_id: 'prod-2', quantity: 2 }])

    expect(toggleMenuExtraSelection(['extra-1'], 'extra-2', true)).toEqual(['extra-1', 'extra-2'])
    expect(toggleMenuExtraSelection(['extra-1', 'extra-2'], 'extra-1', false)).toEqual(['extra-2'])
    expect(getMenuExtraCategoryLabel('border')).toBe('Borda')
    expect(getMenuExtraCategoryLabel('flavor')).toBe('Extras')
    expect(getMenuExtraCategoryLabel('other')).toBe('Outros')
    expect(getMenuExtraCategoryLabel('massas')).toBe('massas')
    expect(
      groupMenuExtrasByCategory([
        { id: 'extra-1', name: 'Catupiry', price: 4, category: 'border' },
        { id: 'extra-2', name: 'Cheddar', price: 3, category: 'border' },
        { id: 'extra-3', name: 'Calabresa', price: 6, category: 'flavor' },
        { id: 'extra-4', name: 'Molho da casa', price: 2, category: 'other' },
      ])
    ).toEqual([
      {
        category: 'border',
        label: 'Borda',
        extras: [
          { id: 'extra-1', name: 'Catupiry', price: 4, category: 'border' },
          { id: 'extra-2', name: 'Cheddar', price: 3, category: 'border' },
        ],
      },
      {
        category: 'flavor',
        label: 'Extras',
        extras: [{ id: 'extra-3', name: 'Calabresa', price: 6, category: 'flavor' }],
      },
      {
        category: 'other',
        label: 'Outros',
        extras: [{ id: 'extra-4', name: 'Molho da casa', price: 2, category: 'other' }],
      },
    ])

    expect(getSelectableMenuExtras(
      [
        { id: 'extra-1', name: 'Catupiry', price: 4, category: 'border' },
        { id: 'extra-2', name: 'Cheddar', price: 3, category: 'border', category_id: 'cat-1' },
        { id: 'extra-3', name: 'Molho da casa', price: 2, category: 'other' },
      ],
      'cat-1',
      [{ id: 'cat-1', name: 'Pizzas' }],
    )).toEqual([
      { id: 'extra-3', name: 'Molho da casa', price: 2, category: 'other' },
    ])

    expect(getPersistedMenuExtraIds(
      ['extra-1', 'extra-3'],
      [
        { id: 'extra-1', name: 'Catupiry', price: 4, category: 'border' },
        { id: 'extra-2', name: 'Cheddar', price: 3, category: 'border', category_id: 'cat-1' },
        { id: 'extra-3', name: 'Molho da casa', price: 2, category: 'other' },
      ],
      'cat-1',
      [{ id: 'cat-1', name: 'Pizzas' }],
    )).toEqual(['extra-3'])

    expect(buildMenuAvailabilityState({ name: 'Pizza', available: true } as never)).toEqual({
      action: 'desativar',
      nextAvailable: false,
      confirmMessage: 'Deseja desativar "Pizza"?',
      errorMessage: 'Erro ao desativar item.',
    })
    expect(buildMenuAvailabilityState({ name: 'Suco', available: false } as never)).toEqual({
      action: 'reativar',
      nextAvailable: true,
      confirmMessage: 'Deseja reativar "Suco"?',
      errorMessage: 'Erro ao reativar item.',
    })
    expect(buildMenuAvailabilityRequest({ id: 'item-1' } as never, false)).toEqual({
      url: '/api/menu-items/item-1',
      init: {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: false }),
      },
    })
  })
})
