'use client'

import { useState } from 'react'
import {
  Clock3,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import FeatureGate from '@/features/plans/components/FeatureGate'
import { useCloseTab, useCreateTab, useTabs } from '@/features/tabs/hooks/useTabs'
import type { Tab } from '@/features/tabs/types'

function getLiveTotal(tab: Tab) {
  if (!tab.orders?.length) return Number(tab.total ?? 0)

  return tab.orders.reduce((sum, order) => {
    if (order.status === 'cancelled') return sum
    return sum + Number(order.total)
  }, 0)
}

const statusConfig = {
  open: {
    label: 'Aberta',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
  closed: {
    label: 'Fechada',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
}

export default function ComandasPage() {
  const [newTabOpen, setNewTabOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null)
  const [newTabLabel, setNewTabLabel] = useState('')
  const [newTabNotes, setNewTabNotes] = useState('')
  const [formError, setFormError] = useState('')
  const { data: openTabs = [], isLoading: openTabsLoading } = useTabs('open')
  const { data: closedTabs = [], isLoading: closedTabsLoading } = useTabs('closed')
  const closeTab = useCloseTab()
  const createTab = useCreateTab()

  const isLoading = openTabsLoading || closedTabsLoading
  const openCount = (openTabs as Tab[]).length
  const closedCount = (closedTabs as Tab[]).length

  async function handleCloseTab(tab: Tab) {
    const confirmed = window.confirm(
      `Fechar a comanda ${tab.label}?\nTotal atual: R$ ${getLiveTotal(tab).toFixed(2)}`
    )

    if (!confirmed) return

    await closeTab.mutateAsync(tab.id)
  }

  async function handleCreateTab() {
    try {
      setFormError('')

      if (!newTabLabel.trim()) {
        setFormError('Informe um identificador para a comanda.')
        return
      }

      await createTab.mutateAsync({
        label: newTabLabel.trim(),
        notes: newTabNotes.trim() || undefined,
      })

      setNewTabLabel('')
      setNewTabNotes('')
      setNewTabOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Erro ao criar comanda.')
    }
  }

  return (
    <FeatureGate feature="tables">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Comandas</h1>
            <p className="mt-1 text-sm text-slate-500">
              {openCount} aberta{openCount !== 1 ? 's' : ''} · {closedCount} fechada
              {closedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setNewTabOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova comanda
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Carregando comandas...</div>
        ) : (openTabs as Tab[]).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center">
            <p className="text-sm text-slate-500">
              Nenhuma comanda avulsa aberta no momento.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setNewTabOpen(true)}>
              Criar primeira comanda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(openTabs as Tab[]).map((tab) => {
              const liveTotal = getLiveTotal(tab)
              const config = statusConfig[tab.status]

              return (
                <div
                  key={tab.id}
                  className={`cursor-pointer rounded-xl border-2 ${config.bg} ${config.border} p-4 transition-shadow hover:shadow-md`}
                  onClick={() => setSelectedTab(tab)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xl font-bold text-slate-900">{tab.label}</span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
                      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    {new Date(tab.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  <div className="border-t border-slate-200/70 pt-3">
                    <p className="text-sm font-semibold text-slate-900">
                      R$ {liveTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {tab.orders?.length ?? 0} pedido{(tab.orders?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                    {tab.notes && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                        {tab.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedTab(tab)
                      }}
                    >
                      Ver detalhes
                    </Button>

                    {tab.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-200 text-xs text-red-600 hover:bg-red-50"
                        disabled={closeTab.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleCloseTab(tab)
                        }}
                      >
                        Fechar comanda
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedTab && (
          <Dialog open={!!selectedTab} onOpenChange={() => setSelectedTab(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Comanda {selectedTab.label}</DialogTitle>
              </DialogHeader>

              <div>
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <Badge variant={selectedTab.status === 'open' ? 'default' : 'secondary'}>
                    {selectedTab.status === 'open' ? 'Aberta' : 'Fechada'}
                  </Badge>
                </div>

                <div className="mb-4 space-y-1 text-sm text-slate-500">
                  <p>
                    Aberta em{' '}
                    {new Date(selectedTab.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {selectedTab.closed_at && (
                    <p>
                      Fechada em{' '}
                      {new Date(selectedTab.closed_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {selectedTab.notes && <p>Obs: {selectedTab.notes}</p>}
                </div>

                {selectedTab.orders?.length ? (
                  <div className="mb-4 space-y-2">
                    {selectedTab.orders.map((order) => (
                      <div key={order.id} className="rounded-lg bg-slate-50 p-3">
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium capitalize">{order.status}</span>
                          <span className="font-semibold">
                            R$ {Number(order.total).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Pagamento: {order.payment_status}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 py-6 text-center text-sm text-slate-400">
                    Nenhum pedido vinculado a esta comanda.
                  </div>
                )}

                <div className="flex justify-between border-t pt-3 font-semibold text-slate-900">
                  <span>Total</span>
                  <span>R$ {getLiveTotal(selectedTab).toFixed(2)}</span>
                </div>

                {selectedTab.status === 'open' && (
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={async () => {
                      await handleCloseTab(selectedTab)
                      setSelectedTab(null)
                    }}
                  >
                    Fechar comanda
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={newTabOpen}
          onOpenChange={(open) => {
            setNewTabOpen(open)
            if (!open) {
              setNewTabLabel('')
              setNewTabNotes('')
              setFormError('')
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova comanda</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Identificador
                </label>
                <Input
                  value={newTabLabel}
                  onChange={(event) => setNewTabLabel(event.target.value)}
                  placeholder="Ex: C-12, Balcao 3, Cliente Joao"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Observacoes
                </label>
                <textarea
                  value={newTabNotes}
                  onChange={(event) => setNewTabNotes(event.target.value)}
                  placeholder="Opcional"
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-400"
                />
              </div>

              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewTabOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={createTab.isPending}
                  onClick={handleCreateTab}
                >
                  {createTab.isPending ? 'Criando...' : 'Criar comanda'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  )
}
