'use client'

import { useMemo, useState } from 'react'
import { useMenuItems, useCreateOrder } from '@/features/orders/hooks/useOrders'
import { useTables } from '@/features/tables/hooks/useTables'
import { useUser } from '@/features/auth/hooks/useUser'
import type { CartItem } from '@/features/orders/types'
import type { Table } from '@/features/tables/types'
import { useCreateTab, useTabs } from '@/features/tabs/hooks/useTabs'
import type { Tab } from '@/features/tabs/types'
import {
  buildManualOrderPayload,
  changeManualOrderItemQuantity,
  getAvailableManualOrderItems,
  getManualOrderAddItemState,
  getManualOrderCreateTabSuccessState,
  getManualOrderCreateTabValidationState,
  getManualOrderCreateTabErrorState,
  getInitialManualOrderFormState,
  getManualOrderModeChangeState,
  getManualOrderResetState,
  getManualOrderSubmitErrorState,
  getManualOrderSubmitValidationState,
  getManualOrderSubmitSuccessState,
  getManualOrderSummaryLabel,
  getManualOrderTotal,
  buildManualOrderTabPayload,
  isManualOrderSubmitting,
  groupManualOrderItems,
  orderManualOrderGroups,
  removeManualOrderItem,
  type ManualOrderMenuItem as MenuItem,
  type ManualOrderMode as OrderMode,
} from '@/features/orders/manual-order-dialog'
import { ManualOrderDialogContent } from '@/features/orders/ManualOrderDialogContent'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ManualOrderDialog({ open, onOpenChange }: Props) {
  const initialFormState = getInitialManualOrderFormState()
  const { user } = useUser()
  const { data: menuItems, isLoading: menuLoading } = useMenuItems()
  const { data: tables = [], isLoading: tablesLoading } = useTables()
  const { data: tabs = [], isLoading: tabsLoading } = useTabs('open')
  const createOrder = useCreateOrder()
  const createTab = useCreateTab()

  const [orderMode, setOrderMode] = useState<OrderMode>(initialFormState.orderMode)
  const [selectedTableId, setSelectedTableId] = useState(initialFormState.selectedTableId)
  const [selectedTabId, setSelectedTabId] = useState(initialFormState.selectedTabId)
  const [newTabLabel, setNewTabLabel] = useState(initialFormState.newTabLabel)
  const [customerName, setCustomerName] = useState(initialFormState.customerName)
  const [customerPhone, setCustomerPhone] = useState(initialFormState.customerPhone)
  const [notes, setNotes] = useState(initialFormState.notes)
  const [cart, setCart] = useState<CartItem[]>(initialFormState.cart)
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(initialFormState.selectedMenuItemId)
  const [errorMessage, setErrorMessage] = useState(initialFormState.errorMessage)

  const availableItems = useMemo(
    () => getAvailableManualOrderItems((menuItems ?? []) as MenuItem[]),
    [menuItems]
  )

  const groupedItems = useMemo(() => {
    return groupManualOrderItems(availableItems)
  }, [availableItems])

  const orderedGroups = useMemo(
    () => orderManualOrderGroups(groupedItems),
    [groupedItems]
  )

  const selectedTable = useMemo(
    () => (tables as Table[]).find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables]
  )

  const total = getManualOrderTotal(cart)

  function resetForm() {
    const nextState = getManualOrderResetState()
    setOrderMode(nextState.orderMode)
    setSelectedTableId(nextState.selectedTableId)
    setSelectedTabId(nextState.selectedTabId)
    setNewTabLabel(nextState.newTabLabel)
    setCustomerName(nextState.customerName)
    setCustomerPhone(nextState.customerPhone)
    setNotes(nextState.notes)
    setCart(nextState.cart)
    setSelectedMenuItemId(nextState.selectedMenuItemId)
    setErrorMessage(nextState.errorMessage)
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  function changeQuantity(menuItemId: string, delta: number) {
    setCart((current) => changeManualOrderItemQuantity(current, menuItemId, delta))
  }

  function removeItem(menuItemId: string) {
    setCart((current) => removeManualOrderItem(current, menuItemId))
  }

  const selectedTab = useMemo(
    () => (tabs as Tab[]).find((tab) => tab.id === selectedTabId) ?? null,
    [selectedTabId, tabs]
  )

  async function handleSubmit() {
    try {
      setErrorMessage('')

      const validationState = getManualOrderSubmitValidationState({
        tenantId: user?.profile.tenant_id,
        cart,
        orderMode,
        selectedTable,
        selectedTabId,
      })
      if (!validationState.shouldSubmit) {
        setErrorMessage(validationState.errorMessage)
        return
      }

      await createOrder.mutateAsync(buildManualOrderPayload({
        tenantId: user.profile.tenant_id,
        customerName,
        customerPhone,
        orderMode,
        selectedTable,
        selectedTabId,
        notes,
        cart,
      }))

      const nextState = getManualOrderSubmitSuccessState()
      setErrorMessage(nextState.errorMessage)
      if (nextState.shouldClose) handleOpenChange(false)
    } catch (error) {
      setErrorMessage(getManualOrderSubmitErrorState(error).errorMessage)
    }
  }

  return (
    <ManualOrderDialogContent
      open={open}
      onOpenChange={handleOpenChange}
      orderMode={orderMode}
      tables={tables as Table[]}
      tablesLoading={tablesLoading}
      selectedTableId={selectedTableId}
      tabs={tabs as Tab[]}
      tabsLoading={tabsLoading}
      selectedTabId={selectedTabId}
      newTabLabel={newTabLabel}
      creatingTab={createTab.isPending}
      onOrderModeChange={(value) => {
        const nextState = getManualOrderModeChangeState(value as OrderMode)
        setOrderMode(nextState.orderMode)
        setSelectedTableId(nextState.selectedTableId)
        setSelectedTabId(nextState.selectedTabId)
      }}
      onTableChange={setSelectedTableId}
      onSelectTab={setSelectedTabId}
      onNewTabLabelChange={setNewTabLabel}
      onCreateTab={async () => {
        try {
          setErrorMessage('')
          const validationState = getManualOrderCreateTabValidationState(newTabLabel)
          if (!validationState.shouldCreate) {
            setErrorMessage(validationState.errorMessage)
            return
          }

          const tab = await createTab.mutateAsync(buildManualOrderTabPayload(newTabLabel))
          const nextState = getManualOrderCreateTabSuccessState(tab.id)
          setSelectedTabId(nextState.selectedTabId)
          setNewTabLabel(nextState.newTabLabel)
          setErrorMessage(nextState.errorMessage)
        } catch (error) {
          setErrorMessage(getManualOrderCreateTabErrorState(error).errorMessage)
        }
      }}
      customerName={customerName}
      customerPhone={customerPhone}
      notes={notes}
      onCustomerNameChange={setCustomerName}
      onCustomerPhoneChange={setCustomerPhone}
      onNotesChange={setNotes}
      availableItemsCount={availableItems.length}
      menuLoading={menuLoading}
      orderedGroups={orderedGroups}
      selectedMenuItemId={selectedMenuItemId}
      onSelectedMenuItemChange={setSelectedMenuItemId}
      onAddItem={() => {
        const nextState = getManualOrderAddItemState(availableItems, selectedMenuItemId, cart)
        setErrorMessage(nextState.errorMessage)
        if (nextState.shouldAdd) {
          setCart(nextState.cart)
          setSelectedMenuItemId(nextState.selectedMenuItemId)
        }
      }}
      summaryLabel={getManualOrderSummaryLabel(orderMode, selectedTable, selectedTab)}
      cart={cart}
      total={total}
      errorMessage={errorMessage}
      submitting={isManualOrderSubmitting({
        createOrderPending: createOrder.isPending,
        createTabPending: createTab.isPending,
        menuLoading,
      })}
      onChangeQuantity={changeQuantity}
      onRemoveItem={removeItem}
      onCancel={() => handleOpenChange(false)}
      onSubmit={handleSubmit}
    />
  )
}
