'use client'

import { useState } from 'react'
import {
  useTables,
  useCreateTable,
  useOpenSession,
  useCloseSession,
} from '@/features/tables/hooks/useTables'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Plus, Users, Clock, QrCode } from 'lucide-react'
import type { Table } from '@/features/tables/types'

const tableSchema = z.object({
  number: z.string().min(1, 'Número obrigatório'),
  capacity: z.coerce.number().int().min(1, 'Capacidade mínima 1'),
})

const sessionSchema = z.object({
  customer_count: z.coerce.number().int().min(1),
})

type TableForm = z.infer<typeof tableSchema>
type SessionForm = z.infer<typeof sessionSchema>

const statusConfig = {
  available: {
    label: 'Livre',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  occupied: {
    label: 'Ocupada',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
  reserved: {
    label: 'Reservada',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  maintenance: {
    label: 'Manutenção',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
  },
}

export default function MesasPage() {
  const [newTableOpen, setNewTableOpen] = useState(false)
  const [openSessionModal, setOpenSessionModal] = useState<Table | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  const { data: tables, isLoading } = useTables()
  const createTable = useCreateTable()
  const openSession = useOpenSession()
  const closeSession = useCloseSession()

  const tableForm = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
    defaultValues: { number: '', capacity: 4 },
  })

  const sessionForm = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { customer_count: 1 },
  })

  async function onCreateTable(values: TableForm) {
    try {
      await createTable.mutateAsync(values)
      setNewTableOpen(false)
      tableForm.reset()
    } catch (e: unknown) {
      tableForm.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao criar mesa.',
      })
    }
  }

  async function onOpenSession(values: SessionForm) {
    if (!openSessionModal) return
    try {
      await openSession.mutateAsync({
        table_id: openSessionModal.id,
        customer_count: values.customer_count,
      })
      setOpenSessionModal(null)
      sessionForm.reset()
    } catch (e: unknown) {
      sessionForm.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao abrir comanda.',
      })
    }
  }

  async function handleCloseSession(table: Table) {
    if (!table.active_session) return
    const confirm = window.confirm(
      `Fechar comanda da Mesa ${table.number}?\nTotal: R$ ${Number(table.active_session.total).toFixed(2)}`
    )
    if (!confirm) return
    try {
      await closeSession.mutateAsync(table.active_session.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao fechar comanda.')
    }
  }

  const available =
    tables?.filter((t: Table) => t.status === 'available').length ?? 0
  const occupied =
    tables?.filter((t: Table) => t.status === 'occupied').length ?? 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mesas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {occupied} ocupada{occupied !== 1 ? 's' : ''} · {available} livre
            {available !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setNewTableOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova mesa
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Carregando...</div>
      ) : tables?.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-500">Nenhuma mesa cadastrada.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setNewTableOpen(true)}
          >
            Cadastrar primeira mesa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables?.map((table: Table) => {
            const config = statusConfig[table.status]
            const session = table.active_session
            return (
              <div
                key={table.id}
                className={`rounded-xl border-2 ${config.bg} ${config.border} cursor-pointer p-4 transition-shadow hover:shadow-md`}
                onClick={() => setSelectedTable(table)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {table.number}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium ${config.text}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                    {config.label}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-3 w-3" />
                  {table.capacity} lugares
                </div>

                {session && (
                  <div className="mt-2 border-t border-orange-200 pt-2">
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {new Date(session.opened_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      R$ {Number(session.total).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {session.orders?.length ?? 0} pedido
                      {(session.orders?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  {table.status === 'available' && (
                    <>
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenSessionModal(table)
                        }}
                      >
                        Abrir comanda
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={async (e) => {
                          e.stopPropagation()
                          const res = await fetch(
                            `/api/tables/qrcode-url?table_id=${table.id}`
                          )
                          const json = await res.json()
                          if (json.url) {
                            await navigator.clipboard.writeText(json.url)
                            alert(`URL copiada!\n${json.url}`)
                          }
                        }}
                      >
                        <QrCode className="mr-1 h-3 w-3" /> Copiar link QR
                      </Button>
                    </>
                  )}
                  {table.status === 'occupied' && session && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTable(table)
                        }}
                      >
                        Ver comanda
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-200 text-xs text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloseSession(table)
                        }}
                      >
                        Fechar comanda
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal detalhe da comanda */}
      {selectedTable && (
        <Dialog
          open={!!selectedTable}
          onOpenChange={() => setSelectedTable(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Mesa {selectedTable.number}</DialogTitle>
            </DialogHeader>
            {selectedTable.active_session ? (
              <div>
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-slate-500">Aberta às</span>
                  <span className="font-medium">
                    {new Date(
                      selectedTable.active_session.opened_at
                    ).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <div className="mb-4 space-y-2">
                  {selectedTable.active_session.orders?.map((order) => (
                    <div key={order.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">
                          Pedido #{order.order_number}
                        </span>
                        <span className="font-semibold">
                          R$ {Number(order.total).toFixed(2)}
                        </span>
                      </div>
                      {order.items?.map((item) => (
                        <p key={item.id} className="text-xs text-slate-500">
                          {item.quantity}× {item.name}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-3 font-semibold text-slate-900">
                  <span>Total</span>
                  <span>
                    R$ {Number(selectedTable.active_session.total).toFixed(2)}
                  </span>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => {
                    handleCloseSession(selectedTable)
                    setSelectedTable(null)
                  }}
                >
                  Fechar comanda
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-slate-400">
                Mesa livre — sem comanda aberta.
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal nova mesa */}
      <Dialog open={newTableOpen} onOpenChange={setNewTableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova mesa</DialogTitle>
          </DialogHeader>
          <Form {...tableForm}>
            <form
              onSubmit={tableForm.handleSubmit(onCreateTable)}
              className="space-y-4"
            >
              <FormField
                control={tableForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número / identificador</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 01, A1, Varanda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {tableForm.formState.errors.root && (
                <p className="text-destructive text-sm">
                  {tableForm.formState.errors.root.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewTableOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={tableForm.formState.isSubmitting}
                >
                  {tableForm.formState.isSubmitting
                    ? 'Criando...'
                    : 'Criar mesa'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal abrir sessão */}
      <Dialog
        open={!!openSessionModal}
        onOpenChange={() => setOpenSessionModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Abrir comanda — Mesa {openSessionModal?.number}
            </DialogTitle>
          </DialogHeader>
          <Form {...sessionForm}>
            <form
              onSubmit={sessionForm.handleSubmit(onOpenSession)}
              className="space-y-4"
            >
              <FormField
                control={sessionForm.control}
                name="customer_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de pessoas</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {sessionForm.formState.errors.root && (
                <p className="text-destructive text-sm">
                  {sessionForm.formState.errors.root.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenSessionModal(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={sessionForm.formState.isSubmitting}
                >
                  {sessionForm.formState.isSubmitting
                    ? 'Abrindo...'
                    : 'Abrir comanda'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
