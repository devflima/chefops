import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import type { ManualOrderMenuItem } from '@/features/orders/manual-order-dialog'

export function ManualOrderItemPicker({
  availableItemsCount,
  menuLoading,
  orderedGroups,
  selectedMenuItemId,
  onSelectedMenuItemChange,
  onAddItem,
}: {
  availableItemsCount: number
  menuLoading: boolean
  orderedGroups: Array<[string, { label: string; items: ManualOrderMenuItem[] }]>
  selectedMenuItemId: string
  onSelectedMenuItemChange: (value: string) => void
  onAddItem: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">Itens do cardapio</h3>
        <Badge variant="secondary">{availableItemsCount} disponiveis</Badge>
      </div>

      {menuLoading ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Carregando itens...
        </div>
      ) : availableItemsCount === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Nenhum item disponivel no cardapio.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Select value={selectedMenuItemId} onValueChange={onSelectedMenuItemChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um item do cardápio" />
              </SelectTrigger>
              <SelectContent>
                {orderedGroups.map(([key, group]) => (
                  <SelectGroup key={key}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - R$ {Number(item.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              className="w-full md:w-auto"
              onClick={onAddItem}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Escolha o item e adicione ao resumo do pedido.
          </p>
        </div>
      )}
    </div>
  )
}
