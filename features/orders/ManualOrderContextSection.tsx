import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ManualOrderTabSection } from '@/features/orders/ManualOrderTabSection'
import type { ManualOrderMode } from '@/features/orders/manual-order-dialog'
import type { Table } from '@/features/tables/types'
import type { Tab } from '@/features/tabs/types'

export function ManualOrderContextSection({
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
}: {
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
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Tipo do pedido</label>
        <Select value={orderMode} onValueChange={(value) => onOrderModeChange(value as ManualOrderMode)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="counter">Balcao / caixa</SelectItem>
            <SelectItem value="table">Mesa / comanda</SelectItem>
            <SelectItem value="tab">Comanda avulsa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orderMode === 'table' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Mesa</label>
          <Select value={selectedTableId} onValueChange={onTableChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tablesLoading ? 'Carregando mesas...' : 'Selecione a mesa'} />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  Mesa {table.number}
                  {table.active_session ? ' • comanda aberta' : ' • abrir comanda'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {orderMode === 'tab' && (
        <ManualOrderTabSection
          tabs={tabs}
          tabsLoading={tabsLoading}
          selectedTabId={selectedTabId}
          newTabLabel={newTabLabel}
          isCreating={creatingTab}
          onSelectTab={onSelectTab}
          onNewTabLabelChange={onNewTabLabelChange}
          onCreateTab={onCreateTab}
        />
      )}
    </div>
  )
}
