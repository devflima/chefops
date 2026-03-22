'use client'

import { useState } from 'react'
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useOpenSession,
  useCloseSession,
} from '@/features/tables/hooks/useTables'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { Table } from '@/features/tables/types'
import FeatureGate from '@/features/plans/components/FeatureGate'
import { useCanAddMore, usePlan } from '@/features/plans/hooks/usePlan'
import {
  buildCloseSessionPrompt,
  getTableActionErrorMessage,
  getTableCloseSelectionState,
  getTableDialogSelectionState,
  getTableEditStartState,
  getTableMetrics,
  getTableQrCopySuccessMessage,
  resolveTableQrUrlResponse,
} from '@/features/tables/tables-page'
import { TablesDashboardHeader } from '@/features/tables/TablesDashboardHeader'
import { TablesDashboardEmptyState } from '@/features/tables/TablesDashboardEmptyState'
import { TablesDashboardGrid } from '@/features/tables/TablesDashboardGrid'
import { TableSessionDetailsDialog } from '@/features/tables/TableSessionDetailsDialog'
import { OpenSessionDialog } from '@/features/tables/OpenSessionDialog'
import { TableFormDialog } from '@/features/tables/TableFormDialog'

const tableSchema = z.object({
  number: z.string().min(1, 'Número obrigatório'),
  capacity: z.coerce.number().int().min(1, 'Capacidade mínima 1'),
})

const sessionSchema = z.object({
  customer_count: z.coerce.number().int().min(1),
})

type TableForm = z.infer<typeof tableSchema>
type SessionForm = z.infer<typeof sessionSchema>

export default function MesasPage() {
  const [newTableOpen, setNewTableOpen] = useState(false)
  const [openSessionModal, setOpenSessionModal] = useState<Table | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  const { data: tables, isLoading } = useTables()
  const createTable = useCreateTable()
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const updateTable = useUpdateTable()
  const deleteTable = useDeleteTable()
  const openSession = useOpenSession()
  const closeSession = useCloseSession()
  const { data: plan } = usePlan()

  const tableForm = useForm<TableForm, unknown, TableForm>({
    resolver: zodResolver(tableSchema) as Resolver<TableForm>,
    defaultValues: { number: '', capacity: 4 },
  })

  const sessionForm = useForm<SessionForm, unknown, SessionForm>({
    resolver: zodResolver(sessionSchema) as Resolver<SessionForm>,
    defaultValues: { customer_count: 1 },
  })

  async function onCreateTable(values: TableForm) {
    try {
      await createTable.mutateAsync(values)
      setNewTableOpen(false)
      tableForm.reset()
    } catch (e: unknown) {
      tableForm.setError('root', {
        message: getTableActionErrorMessage(e, 'Erro ao criar mesa.'),
      })
    }
  }

  async function handleDeleteTable(table: Table) {
    if (!confirm(`Excluir a Mesa ${table.number}? Esta ação não pode ser desfeita.`)) return
      try {
        await deleteTable.mutateAsync(table.id)
      } catch (e: unknown) {
        alert(getTableActionErrorMessage(e, 'Erro ao excluir mesa.'))
      }
  }

  async function onEditTable(values: TableForm) {
    if (!editingTable) return
      try {
        await updateTable.mutateAsync({ id: editingTable.id, ...values })
        setEditingTable(null)
        tableForm.reset()
      } catch (e: unknown) {
        tableForm.setError('root', { message: getTableActionErrorMessage(e, 'Erro ao atualizar mesa.') })
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
        message: getTableActionErrorMessage(e, 'Erro ao abrir comanda.'),
      })
    }
  }

  async function handleCloseSession(table: Table) {
    if (!table.active_session) return
    const prompt = buildCloseSessionPrompt(table)
    const confirm = prompt ? window.confirm(prompt) : false
    if (!confirm) return
    try {
      await closeSession.mutateAsync(table.active_session.id)
    } catch (e: unknown) {
      alert(getTableActionErrorMessage(e, 'Erro ao fechar comanda.'))
    }
  }

  const { available, occupied, tableCount } = getTableMetrics(tables)
  const canAddMoreTables = useCanAddMore('tables', tableCount)
  const tableLimitReached = !!plan && !canAddMoreTables

  return (
    <FeatureGate feature='tables'>
      <div>
        <TablesDashboardHeader
          occupied={occupied}
          available={available}
          tableCount={tableCount}
          maxTables={plan?.max_tables}
          tableLimitReached={tableLimitReached}
          onCreate={() => setNewTableOpen(true)}
        />

        {tableLimitReached && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            O plano atual atingiu o limite de {plan?.max_tables} mesas. Faça upgrade para cadastrar mais.
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Carregando...</div>
        ) : tables?.length === 0 ? (
          <TablesDashboardEmptyState
            tableLimitReached={tableLimitReached}
            onCreate={() => setNewTableOpen(true)}
          />
        ) : (
          <TablesDashboardGrid
            tables={tables}
            onSelect={setSelectedTable}
            onEdit={(table) => {
              const nextState = getTableEditStartState(table)
              setEditingTable(nextState.editingTable as Table)
              tableForm.reset(nextState.formValues)
              setNewTableOpen(nextState.newTableOpen)
            }}
            onDelete={handleDeleteTable}
            onOpenSession={setOpenSessionModal}
            onCopyQr={async (table) => {
              const res = await fetch(`/api/tables/qrcode-url?table_id=${table.id}`)
              const json = await res.json()
              const qrUrl = resolveTableQrUrlResponse(json)
              if (!qrUrl) return

              try {
                await navigator.clipboard.writeText(qrUrl)
                alert(getTableQrCopySuccessMessage(qrUrl))
              } catch {
                const el = document.createElement('textarea')
                el.value = qrUrl
                el.style.position = 'fixed'
                el.style.opacity = '0'
                document.body.appendChild(el)
                el.focus()
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
                alert(getTableQrCopySuccessMessage(qrUrl))
              }
            }}
            onCloseSession={handleCloseSession}
          />
        )}

        {/* Modal detalhe da comanda */}
        <TableSessionDetailsDialog
          table={selectedTable}
          open={!!selectedTable}
          onOpenChange={(open) => {
            const nextSelectedTable = getTableDialogSelectionState(open)
            if (nextSelectedTable === null) setSelectedTable(nextSelectedTable)
          }}
          onCloseSession={(table) => {
            handleCloseSession(table)
            setSelectedTable(getTableCloseSelectionState())
          }}
        />

        {/* Modal nova mesa */}
        <TableFormDialog
          open={newTableOpen}
          editingTable={editingTable}
          errorMessage={tableForm.formState.errors.root?.message}
          isSubmitting={tableForm.formState.isSubmitting}
          onOpenChange={setNewTableOpen}
        >
          <Form {...tableForm}>
            <form
              onSubmit={tableForm.handleSubmit(editingTable ? onEditTable : onCreateTable)}
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
              </form>
          </Form>
        </TableFormDialog>

        {/* Modal abrir sessão */}
        <OpenSessionDialog
          table={openSessionModal}
          open={!!openSessionModal}
          errorMessage={sessionForm.formState.errors.root?.message}
          isSubmitting={sessionForm.formState.isSubmitting}
          onOpenChange={(open) => {
            const nextSelectedTable = getTableDialogSelectionState(open)
            if (nextSelectedTable === null) setOpenSessionModal(nextSelectedTable)
          }}
        >
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
              </form>
            </Form>
        </OpenSessionDialog>
      </div>
    </FeatureGate>
  )
}
