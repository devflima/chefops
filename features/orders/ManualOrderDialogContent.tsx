import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { CartItem } from '@/features/orders/types'
import type { Table } from '@/features/tables/types'
import type { Tab } from '@/features/tabs/types'
import type {
  ManualOrderMenuItem,
  ManualOrderMode,
} from '@/features/orders/manual-order-dialog'

import { ManualOrderContextSection } from '@/features/orders/ManualOrderContextSection'
import { ManualOrderCustomerFields } from '@/features/orders/ManualOrderCustomerFields'
import { ManualOrderItemPicker } from '@/features/orders/ManualOrderItemPicker'
import { ManualOrderSummary } from '@/features/orders/ManualOrderSummary'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderMode: ManualOrderMode
  tables: Table[]
  tablesLoading: boolean
  selectedTableId: string
  tabs: Tab[]
  tabsLoading: boolean
  selectedTabId: string
  newTabLabel: string
  creatingTab: boolean
  onOrderModeChange: (value: ManualOrderMode) => void
  onTableChange: (value: string) => void
  onSelectTab: (value: string) => void
  onNewTabLabelChange: (value: string) => void
  onCreateTab: () => void | Promise<void>
  customerName: string
  customerPhone: string
  notes: string
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onNotesChange: (value: string) => void
  availableItemsCount: number
  menuLoading: boolean
  orderedGroups: Array<[string, { label: string; items: ManualOrderMenuItem[] }]>
  selectedMenuItemId: string
  onSelectedMenuItemChange: (value: string) => void
  onAddItem: () => void
  summaryLabel: string
  cart: CartItem[]
  total: number
  errorMessage: string
  submitting: boolean
  onChangeQuantity: (menuItemId: string, delta: number) => void
  onRemoveItem: (menuItemId: string) => void
  onCancel: () => void
  onSubmit: () => void | Promise<void>
}

export function ManualOrderDialogContent({
  open,
  onOpenChange,
  orderMode,
  tables,
  tablesLoading,
  selectedTableId,
  tabs,
  tabsLoading,
  selectedTabId,
  newTabLabel,
  creatingTab,
  onOrderModeChange,
  onTableChange,
  onSelectTab,
  onNewTabLabelChange,
  onCreateTab,
  customerName,
  customerPhone,
  notes,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onNotesChange,
  availableItemsCount,
  menuLoading,
  orderedGroups,
  selectedMenuItemId,
  onSelectedMenuItemChange,
  onAddItem,
  summaryLabel,
  cart,
  total,
  errorMessage,
  submitting,
  onChangeQuantity,
  onRemoveItem,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[min(820px,calc(100%-0.75rem))] max-w-none overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle>Novo pedido manual</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(95vh-73px)] overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <ManualOrderContextSection
              orderMode={orderMode}
              tables={tables}
              tablesLoading={tablesLoading}
              selectedTableId={selectedTableId}
              tabs={tabs}
              tabsLoading={tabsLoading}
              selectedTabId={selectedTabId}
              newTabLabel={newTabLabel}
              creatingTab={creatingTab}
              onOrderModeChange={onOrderModeChange}
              onTableChange={onTableChange}
              onSelectTab={onSelectTab}
              onNewTabLabelChange={onNewTabLabelChange}
              onCreateTab={onCreateTab}
            />

            <ManualOrderCustomerFields
              customerName={customerName}
              customerPhone={customerPhone}
              notes={notes}
              onCustomerNameChange={onCustomerNameChange}
              onCustomerPhoneChange={onCustomerPhoneChange}
              onNotesChange={onNotesChange}
            />

            <ManualOrderItemPicker
              availableItemsCount={availableItemsCount}
              menuLoading={menuLoading}
              orderedGroups={orderedGroups}
              selectedMenuItemId={selectedMenuItemId}
              onSelectedMenuItemChange={onSelectedMenuItemChange}
              onAddItem={onAddItem}
            />

            <ManualOrderSummary
              summaryLabel={summaryLabel}
              cart={cart}
              total={total}
              errorMessage={errorMessage}
              submitting={submitting}
              onChangeQuantity={onChangeQuantity}
              onRemoveItem={onRemoveItem}
              onCancel={onCancel}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
