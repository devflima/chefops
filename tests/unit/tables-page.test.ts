import { describe, expect, it } from 'vitest'

import {
  buildCloseSessionPrompt,
  getTableActionErrorMessage,
  getTableCloseSelectionState,
  getTableDialogSelectionState,
  getTableEditStartState,
  getTableEditFormValues,
  getOpenSessionSubmitLabel,
  getTableFormDialogTitle,
  getTableFormSubmitLabel,
  getTableDetailsTotal,
  getTableMetrics,
  getTableOrdersCount,
  getTableQrCopySuccessMessage,
  resolveTableQrUrlResponse,
  tableStatusConfig,
} from '@/features/tables/tables-page'

describe('tables-page helpers', () => {
  it('calcula metricas agregadas das mesas', () => {
    expect(getTableMetrics([
      { id: '1', status: 'available' },
      { id: '2', status: 'occupied' },
      { id: '3', status: 'occupied' },
    ] as never)).toEqual({
      available: 1,
      occupied: 2,
      tableCount: 3,
    })

    expect(getTableMetrics(undefined)).toEqual({
      available: 0,
      occupied: 0,
      tableCount: 0,
    })
  })

  it('gera resumo e prompt de fechamento da comanda', () => {
    const table = {
      number: '10',
      active_session: {
        total: 42.5,
        orders: [{ id: 'order-1' }, { id: 'order-2' }],
      },
    }

    expect(buildCloseSessionPrompt(table as never)).toBe('Fechar comanda da Mesa 10?\nTotal: R$ 42.50')
    expect(getTableOrdersCount(table as never)).toBe(2)
    expect(getTableDetailsTotal(table as never)).toBe('42.50')
    expect(buildCloseSessionPrompt({ number: '11', active_session: null } as never)).toBeNull()
  })

  it('expoe configuracao de status das mesas', () => {
    expect(tableStatusConfig.available.label).toBe('Livre')
    expect(tableStatusConfig.occupied.dot).toContain('orange')
    expect(tableStatusConfig.maintenance.text).toContain('slate')
  })

  it('resolve labels dos dialogs e url do QR code', () => {
    expect(getTableFormDialogTitle({ number: '15' } as never)).toBe('Editar Mesa 15')
    expect(getTableFormDialogTitle(null)).toBe('Nova mesa')
    expect(getTableFormSubmitLabel(true)).toBe('Criando...')
    expect(getTableFormSubmitLabel(false)).toBe('Criar mesa')
    expect(getOpenSessionSubmitLabel(true)).toBe('Abrindo...')
    expect(getOpenSessionSubmitLabel(false)).toBe('Abrir comanda')
    expect(resolveTableQrUrlResponse({ url: 'https://chefops.test/qrcode' })).toBe('https://chefops.test/qrcode')
    expect(resolveTableQrUrlResponse({})).toBeNull()
  })

  it('resolve valores de edicao e mensagens auxiliares', () => {
    expect(getTableEditFormValues({ number: 'A1', capacity: 6 } as never)).toEqual({
      number: 'A1',
      capacity: 6,
    })
    expect(getTableEditStartState({ number: 'A1', capacity: 6 } as never)).toEqual({
      editingTable: { number: 'A1', capacity: 6 },
      newTableOpen: true,
      formValues: { number: 'A1', capacity: 6 },
    })
    expect(getTableDialogSelectionState(true)).toBeUndefined()
    expect(getTableDialogSelectionState(false)).toBeNull()
    expect(getTableCloseSelectionState()).toBeNull()

    expect(getTableActionErrorMessage(new Error('Falhou'), 'fallback')).toBe('Falhou')
    expect(getTableActionErrorMessage('erro', 'fallback')).toBe('fallback')
    expect(getTableQrCopySuccessMessage('https://chefops.test/qr')).toBe('URL copiada!\nhttps://chefops.test/qr')
  })
})
