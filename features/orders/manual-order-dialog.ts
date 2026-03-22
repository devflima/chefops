import type { CartItem } from '@/features/orders/types'
import type { Table } from '@/features/tables/types'
import type { Tab } from '@/features/tabs/types'

export type ManualOrderMode = 'counter' | 'table' | 'tab'

export type ManualOrderMenuItem = {
  id: string
  name: string
  price: number
  available: boolean
  category?: { id: string; name: string } | null
}

export type ManualOrderPayloadParams = {
  tenantId: string
  customerName: string
  customerPhone: string
  orderMode: ManualOrderMode
  selectedTable: Table | null
  selectedTabId: string
  notes: string
  cart: CartItem[]
}

export type ManualOrderFormState = {
  orderMode: ManualOrderMode
  selectedTableId: string
  selectedTabId: string
  newTabLabel: string
  customerName: string
  customerPhone: string
  notes: string
  cart: CartItem[]
  selectedMenuItemId: string
  errorMessage: string
}

export function getInitialManualOrderFormState(): ManualOrderFormState {
  return {
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
  }
}

export function getManualOrderErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao criar pedido.'
}

export function getAvailableManualOrderItems(menuItems: ManualOrderMenuItem[]) {
  return menuItems.filter((item) => item.available)
}

export function getManualOrderModeChangeState(orderMode: ManualOrderMode) {
  return {
    orderMode,
    selectedTableId: '',
    selectedTabId: '',
  }
}

export function getManualOrderResetState() {
  return getInitialManualOrderFormState()
}

export function getManualOrderSelectedItemToAdd(
  availableItems: ManualOrderMenuItem[],
  selectedMenuItemId: string
) {
  const item = availableItems.find((entry) => entry.id === selectedMenuItemId)

  return {
    item,
    errorMessage: item ? '' : 'Selecione um item do cardápio para adicionar.',
  }
}

export function getManualOrderSelectedItemSuccessState(
  cart: CartItem[],
  item: ManualOrderMenuItem
) {
  return {
    cart: addManualOrderItem(cart, item),
    selectedMenuItemId: '',
    errorMessage: '',
  }
}

export function groupManualOrderItems(menuItems: ManualOrderMenuItem[]) {
  return menuItems.reduce<Record<string, { label: string; items: ManualOrderMenuItem[] }>>(
    (acc, item) => {
      const key = item.category?.id ?? 'sem-categoria'
      if (!acc[key]) {
        acc[key] = {
          label: item.category?.name ?? 'Sem categoria',
          items: [],
        }
      }
      acc[key].items.push(item)
      return acc
    },
    {}
  )
}

export function orderManualOrderGroups(
  groupedItems: Record<string, { label: string; items: ManualOrderMenuItem[] }>
) {
  return Object.entries(groupedItems).sort((a, b) => a[1].label.localeCompare(b[1].label))
}

export function addManualOrderItem(cart: CartItem[], item: ManualOrderMenuItem) {
  const existingIndex = cart.findIndex((cartItem) => cartItem.menu_item_id === item.id)

  if (existingIndex >= 0) {
    return cart.map((cartItem, index) =>
      index === existingIndex
        ? { ...cartItem, quantity: cartItem.quantity + 1 }
        : cartItem
    )
  }

  return [
    ...cart,
    {
      menu_item_id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1,
    },
  ]
}

export function changeManualOrderItemQuantity(cart: CartItem[], menuItemId: string, delta: number) {
  return cart
    .map((item) =>
      item.menu_item_id === menuItemId
        ? { ...item, quantity: item.quantity + delta }
        : item
    )
    .filter((item) => item.quantity > 0)
}

export function removeManualOrderItem(cart: CartItem[], menuItemId: string) {
  return cart.filter((item) => item.menu_item_id !== menuItemId)
}

export function getManualOrderTotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function getManualOrderSummaryLabel(
  orderMode: ManualOrderMode,
  selectedTable: Table | null,
  selectedTab: Tab | null
) {
  if (orderMode === 'table') {
    return selectedTable ? `Vinculado a Mesa ${selectedTable.number}` : 'Selecione uma mesa'
  }

  if (orderMode === 'tab') {
    return selectedTab ? `Vinculado a comanda ${selectedTab.label}` : 'Selecione uma comanda'
  }

  return 'Pedido de balcao'
}

export function validateNewManualTabLabel(newTabLabel: string) {
  return newTabLabel.trim() ? '' : 'Informe um identificador para criar a comanda.'
}

export function buildManualOrderTabPayload(newTabLabel: string) {
  return {
    label: newTabLabel.trim(),
  }
}

export function getManualOrderCreateTabSuccessState(tabId: string) {
  return {
    selectedTabId: tabId,
    newTabLabel: '',
    errorMessage: '',
  }
}

export function getManualOrderCreateTabErrorState(error: unknown) {
  return {
    errorMessage: getManualOrderErrorMessage(error),
  }
}

export function getManualOrderCreateTabValidationState(newTabLabel: string) {
  const errorMessage = validateNewManualTabLabel(newTabLabel)

  return {
    shouldCreate: !errorMessage,
    errorMessage,
  }
}

export function isManualOrderSubmitting(params: {
  createOrderPending: boolean
  createTabPending: boolean
  menuLoading: boolean
}) {
  return params.createOrderPending || params.createTabPending || params.menuLoading
}

export function buildManualOrderPayload(params: ManualOrderPayloadParams) {
  return {
    tenant_id: params.tenantId,
    customer_name: params.customerName.trim() || undefined,
    customer_phone: params.customerPhone.replace(/\D/g, '') || undefined,
    table_id: params.orderMode === 'table' ? params.selectedTable?.id : undefined,
    table_number: params.orderMode === 'table' ? params.selectedTable?.number : undefined,
    tab_id: params.orderMode === 'tab' ? params.selectedTabId : undefined,
    payment_method: params.orderMode === 'table' ? 'table' : 'counter',
    notes: params.notes.trim() || undefined,
    items: params.cart,
  }
}

export function validateManualOrderSubmission(params: {
  tenantId?: string
  cart: CartItem[]
  orderMode: ManualOrderMode
  selectedTable: Table | null
  selectedTabId: string
}) {
  if (!params.tenantId) {
    return 'Não foi possível identificar o estabelecimento atual.'
  }

  if (params.cart.length === 0) {
    return 'Adicione ao menos um item ao pedido.'
  }

  if (params.orderMode === 'table' && !params.selectedTable) {
    return 'Selecione uma mesa para vincular o pedido.'
  }

  if (params.orderMode === 'tab' && !params.selectedTabId) {
    return 'Selecione ou crie uma comanda para vincular o pedido.'
  }

  return ''
}

export function getManualOrderSubmitSuccessState() {
  return {
    shouldClose: true,
    errorMessage: '',
  }
}

export function getManualOrderSubmitErrorState(error: unknown) {
  return {
    errorMessage: getManualOrderErrorMessage(error),
  }
}

export function getManualOrderSubmitValidationState(params: {
  tenantId?: string
  cart: CartItem[]
  orderMode: ManualOrderMode
  selectedTable: Table | null
  selectedTabId: string
}) {
  const errorMessage = validateManualOrderSubmission(params)

  return {
    shouldSubmit: !errorMessage,
    errorMessage,
  }
}

export function getManualOrderAddItemState(
  availableItems: ManualOrderMenuItem[],
  selectedMenuItemId: string,
  cart: CartItem[]
) {
  const selection = getManualOrderSelectedItemToAdd(availableItems, selectedMenuItemId)

  if (!selection.item) {
    return {
      cart,
      selectedMenuItemId,
      errorMessage: selection.errorMessage,
      shouldAdd: false,
    }
  }

  const successState = getManualOrderSelectedItemSuccessState(cart, selection.item)

  return {
    ...successState,
    shouldAdd: true,
  }
}
