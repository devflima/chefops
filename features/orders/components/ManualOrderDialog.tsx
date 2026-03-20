'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { useMenuItems, useCreateOrder } from '@/features/orders/hooks/useOrders'
import { useTables } from '@/features/tables/hooks/useTables'
import { useUser } from '@/features/auth/hooks/useUser'
import type { CartItem } from '@/features/orders/types'
import type { Table } from '@/features/tables/types'
import { useCreateTab, useTabs } from '@/features/tabs/hooks/useTabs'
import type { Tab } from '@/features/tabs/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type OrderMode = 'counter' | 'table' | 'tab'

type MenuItem = {
  id: string
  name: string
  price: number
  available: boolean
  category?: { id: string; name: string } | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao criar pedido.'
}

export default function ManualOrderDialog({ open, onOpenChange }: Props) {
  const { user } = useUser()
  const { data: menuItems, isLoading: menuLoading } = useMenuItems()
  const { data: tables = [], isLoading: tablesLoading } = useTables()
  const { data: tabs = [], isLoading: tabsLoading } = useTabs('open')
  const createOrder = useCreateOrder()
  const createTab = useCreateTab()

  const [orderMode, setOrderMode] = useState<OrderMode>('counter')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [selectedTabId, setSelectedTabId] = useState('')
  const [newTabLabel, setNewTabLabel] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const availableItems = useMemo(
    () => ((menuItems ?? []) as MenuItem[]).filter((item) => item.available),
    [menuItems]
  )

  const groupedItems = useMemo(() => {
    return availableItems.reduce<Record<string, { label: string; items: MenuItem[] }>>(
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
  }, [availableItems])

  const orderedGroups = useMemo(
    () => Object.entries(groupedItems).sort((a, b) => a[1].label.localeCompare(b[1].label)),
    [groupedItems]
  )

  const selectedTable = useMemo(
    () => (tables as Table[]).find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables]
  )

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function resetForm() {
    setOrderMode('counter')
    setSelectedTableId('')
    setSelectedTabId('')
    setNewTabLabel('')
    setCustomerName('')
    setCustomerPhone('')
    setNotes('')
    setCart([])
    setSelectedMenuItemId('')
    setErrorMessage('')
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  function addItem(item: MenuItem) {
    setCart((current) => {
      const existingIndex = current.findIndex((cartItem) => cartItem.menu_item_id === item.id)

      if (existingIndex >= 0) {
        return current.map((cartItem, index) =>
          index === existingIndex
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }

      return [
        ...current,
        {
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
        },
      ]
    })
  }

  function changeQuantity(menuItemId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.menu_item_id === menuItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeItem(menuItemId: string) {
    setCart((current) => current.filter((item) => item.menu_item_id !== menuItemId))
  }

  const selectedTab = useMemo(
    () => (tabs as Tab[]).find((tab) => tab.id === selectedTabId) ?? null,
    [selectedTabId, tabs]
  )

  async function handleSubmit() {
    try {
      setErrorMessage('')

      if (!user?.profile.tenant_id) {
        setErrorMessage('Não foi possível identificar o estabelecimento atual.')
        return
      }

      if (cart.length === 0) {
        setErrorMessage('Adicione ao menos um item ao pedido.')
        return
      }

      if (orderMode === 'table' && !selectedTable) {
        setErrorMessage('Selecione uma mesa para vincular o pedido.')
        return
      }

      if (orderMode === 'tab' && !selectedTabId) {
        setErrorMessage('Selecione ou crie uma comanda para vincular o pedido.')
        return
      }

      await createOrder.mutateAsync({
        tenant_id: user.profile.tenant_id,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.replace(/\D/g, '') || undefined,
        table_id: orderMode === 'table' ? selectedTable?.id : undefined,
        table_number: orderMode === 'table' ? selectedTable?.number : undefined,
        tab_id: orderMode === 'tab' ? selectedTabId : undefined,
        payment_method: orderMode === 'table' ? 'table' : 'counter',
        notes: notes.trim() || undefined,
        items: cart,
      })

      handleOpenChange(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[95vh] w-[min(820px,calc(100%-0.75rem))] max-w-none overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle>Novo pedido manual</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(95vh-73px)] overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipo do pedido</label>
                <Select
                  value={orderMode}
                  onValueChange={(value) => {
                    setOrderMode(value as OrderMode)
                    setSelectedTableId('')
                    setSelectedTabId('')
                  }}
                >
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
                  <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tablesLoading ? 'Carregando mesas...' : 'Selecione a mesa'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(tables as Table[]).map((table) => (
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Comanda</label>
                  <Select value={selectedTabId} onValueChange={setSelectedTabId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tabsLoading ? 'Carregando comandas...' : 'Selecione a comanda'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(tabs as Tab[]).map((tab) => (
                        <SelectItem key={tab.id} value={tab.id}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {orderMode === 'tab' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={newTabLabel}
                    onChange={(event) => setNewTabLabel(event.target.value)}
                    placeholder="Nova comanda, ex: C-12 ou Balcao 3"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={createTab.isPending}
                    onClick={async () => {
                      try {
                        setErrorMessage('')
                        if (!newTabLabel.trim()) {
                          setErrorMessage('Informe um identificador para criar a comanda.')
                          return
                        }

                        const tab = await createTab.mutateAsync({
                          label: newTabLabel.trim(),
                        })

                        setSelectedTabId(tab.id)
                        setNewTabLabel('')
                      } catch (error) {
                        setErrorMessage(getErrorMessage(error))
                      }
                    }}
                  >
                    {createTab.isPending ? 'Criando...' : 'Criar comanda'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Use uma comanda existente ou crie uma nova sem sair desta tela.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Cliente</label>
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Telefone</label>
                <Input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Observacoes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex: sem cebola, prioridade alta, cliente retira no caixa"
                className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-400"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Itens do cardapio</h3>
                <Badge variant="secondary">{availableItems.length} disponiveis</Badge>
              </div>

              {menuLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  Carregando itens...
                </div>
              ) : availableItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  Nenhum item disponivel no cardapio.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
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
                      onClick={() => {
                        const item = availableItems.find((entry) => entry.id === selectedMenuItemId)
                        if (!item) {
                          setErrorMessage('Selecione um item do cardápio para adicionar.')
                          return
                        }
                        setErrorMessage('')
                        addItem(item)
                        setSelectedMenuItemId('')
                      }}
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
            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900">Resumo</h3>
                <p className="text-sm text-slate-500">
                  {orderMode === 'table'
                    ? selectedTable
                      ? `Vinculado a Mesa ${selectedTable.number}`
                      : 'Selecione uma mesa'
                    : orderMode === 'tab'
                      ? selectedTab
                        ? `Vinculado a comanda ${selectedTab.label}`
                        : 'Selecione uma comanda'
                      : 'Pedido de balcao'}
                </p>
              </div>
              <Badge>{cart.reduce((sum, item) => sum + item.quantity, 0)} itens</Badge>
            </div>

            <div className="space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                  Adicione itens para montar o pedido.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.menu_item_id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">
                          R$ {Number(item.price).toFixed(2)} cada
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.menu_item_id)}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => changeQuantity(item.menu_item_id, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-medium text-slate-700">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => changeQuantity(item.menu_item_id, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-semibold text-slate-900">
                  R$ {total.toFixed(2)}
                </span>
              </div>

              {errorMessage && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <div className="mt-6 pt-1">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={createOrder.isPending || createTab.isPending || menuLoading}
                    onClick={handleSubmit}
                  >
                    {createOrder.isPending ? 'Criando...' : 'Criar pedido'}
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
