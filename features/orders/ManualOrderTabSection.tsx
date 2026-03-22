import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tab } from '@/features/tabs/types'

export function ManualOrderTabSection({
  tabs,
  tabsLoading,
  selectedTabId,
  newTabLabel,
  isCreating,
  onSelectTab,
  onNewTabLabelChange,
  onCreateTab,
}: {
  tabs: Tab[]
  tabsLoading: boolean
  selectedTabId: string
  newTabLabel: string
  isCreating: boolean
  onSelectTab: (value: string) => void
  onNewTabLabelChange: (value: string) => void
  onCreateTab: () => void
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Comanda</label>
        <Select value={selectedTabId} onValueChange={onSelectTab}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={tabsLoading ? 'Carregando comandas...' : 'Selecione a comanda'} />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={newTabLabel}
            onChange={(event) => onNewTabLabelChange(event.target.value)}
            placeholder="Nova comanda, ex: C-12 ou Balcao 3"
          />
          <Button type="button" variant="outline" disabled={isCreating} onClick={onCreateTab}>
            {isCreating ? 'Criando...' : 'Criar comanda'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Use uma comanda existente ou crie uma nova sem sair desta tela.
        </p>
      </div>
    </>
  )
}
