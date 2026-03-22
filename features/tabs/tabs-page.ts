import type { Tab } from '@/features/tabs/types'

export const tabStatusConfig = {
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

export function getLiveTotal(tab: Tab) {
  if (!tab.orders?.length) return Number(tab.total ?? 0)

  return tab.orders.reduce((sum, order) => {
    if (order.status === 'cancelled') return sum
    return sum + Number(order.total)
  }, 0)
}

export function getTabsSummary(openTabs: Tab[] | undefined, closedTabs: Tab[] | undefined) {
  return {
    openCount: (openTabs ?? []).length,
    closedCount: (closedTabs ?? []).length,
  }
}

export function buildCloseTabPrompt(tab: Tab) {
  return `Fechar a comanda ${tab.label}?\nTotal atual: R$ ${getLiveTotal(tab).toFixed(2)}`
}

export function validateNewTabLabel(label: string) {
  return label.trim().length > 0
}

export function getNewTabFormError(label: string) {
  return validateNewTabLabel(label) ? '' : 'Informe um identificador para a comanda.'
}

export function buildCreateTabPayload(label: string, notes: string) {
  return {
    label: label.trim(),
    notes: notes.trim() || undefined,
  }
}

export function getCreateTabErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao criar comanda.'
}

export function getNewTabDialogState(open: boolean) {
  if (open) return null

  return {
    newTabLabel: '',
    newTabNotes: '',
    formError: '',
  }
}

export function getNewTabOpenState() {
  return true
}

export function getClosedTabSelectionState() {
  return null
}

export function getTabDetailsDialogState(open: boolean) {
  return open ? undefined : null
}
