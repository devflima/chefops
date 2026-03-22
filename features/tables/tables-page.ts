import type { Table, TableStatus } from '@/features/tables/types'

export const tableStatusConfig: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
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

export function getTableMetrics(tables: Table[] | undefined) {
  const list = tables ?? []
  const available = list.filter((table) => table.status === 'available').length
  const occupied = list.filter((table) => table.status === 'occupied').length
  const tableCount = list.length

  return { available, occupied, tableCount }
}

export function buildCloseSessionPrompt(table: Pick<Table, 'number' | 'active_session'>) {
  if (!table.active_session) return null

  return `Fechar comanda da Mesa ${table.number}?\nTotal: R$ ${Number(table.active_session.total).toFixed(2)}`
}

export function getTableOrdersCount(table: Pick<Table, 'active_session'>) {
  return table.active_session?.orders?.length ?? 0
}

export function getTableDetailsTotal(table: Pick<Table, 'active_session'>) {
  return Number(table.active_session?.total ?? 0).toFixed(2)
}

export function getTableFormDialogTitle(table: Pick<Table, 'number'> | null) {
  return table ? `Editar Mesa ${table.number}` : 'Nova mesa'
}

export function getTableFormSubmitLabel(isSubmitting: boolean) {
  return isSubmitting ? 'Criando...' : 'Criar mesa'
}

export function getOpenSessionSubmitLabel(isSubmitting: boolean) {
  return isSubmitting ? 'Abrindo...' : 'Abrir comanda'
}

export function resolveTableQrUrlResponse(payload: { url?: string | null } | null | undefined) {
  return payload?.url ?? null
}

export function getTableEditFormValues(table: Pick<Table, 'number' | 'capacity'>) {
  return {
    number: table.number,
    capacity: table.capacity,
  }
}

export function getTableActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function getTableQrCopySuccessMessage(qrUrl: string) {
  return `URL copiada!\n${qrUrl}`
}

export function getTableEditStartState(table: Pick<Table, 'number' | 'capacity'>) {
  return {
    editingTable: table,
    newTableOpen: true,
    formValues: getTableEditFormValues(table),
  }
}

export function getTableDialogSelectionState(open: boolean) {
  return open ? undefined : null
}

export function getTableCloseSelectionState() {
  return null
}
