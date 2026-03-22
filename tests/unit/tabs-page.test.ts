import { describe, expect, it } from 'vitest'

import {
  buildCloseTabPrompt,
  buildCreateTabPayload,
  getCreateTabErrorMessage,
  getClosedTabSelectionState,
  getNewTabDialogState,
  getNewTabFormError,
  getNewTabOpenState,
  getTabDetailsDialogState,
  getLiveTotal,
  getTabsSummary,
  tabStatusConfig,
  validateNewTabLabel,
} from '@/features/tabs/tabs-page'

describe('tabs page helpers', () => {
  it('calcula total ao vivo e resumo das comandas', () => {
    const openTab = {
      label: 'C-12',
      total: 20,
      orders: [
        { status: 'confirmed', total: 30 },
        { status: 'cancelled', total: 10 },
      ],
    }

    expect(getLiveTotal(openTab as never)).toBe(30)
    expect(getTabsSummary([{ id: '1' }] as never, [{ id: '2' }, { id: '3' }] as never)).toEqual({
      openCount: 1,
      closedCount: 2,
    })
  })

  it('gera prompt e valida nova comanda', () => {
    expect(buildCloseTabPrompt({
      label: 'C-12',
      total: 20,
      orders: [{ status: 'confirmed', total: 30 }],
    } as never)).toBe('Fechar a comanda C-12?\nTotal atual: R$ 30.00')

    expect(validateNewTabLabel('   ')).toBe(false)
    expect(validateNewTabLabel('Mesa externa')).toBe(true)
    expect(tabStatusConfig.open.label).toBe('Aberta')
  })

  it('monta payload, erro e reset do modal de comandas', () => {
    expect(getNewTabFormError('   ')).toBe('Informe um identificador para a comanda.')
    expect(getNewTabFormError('C-10')).toBe('')

    expect(buildCreateTabPayload(' C-10 ', ' Janela ')).toEqual({
      label: 'C-10',
      notes: 'Janela',
    })
    expect(buildCreateTabPayload('Balcao', '   ')).toEqual({
      label: 'Balcao',
      notes: undefined,
    })

    expect(getCreateTabErrorMessage(new Error('boom'))).toBe('boom')
    expect(getCreateTabErrorMessage(null)).toBe('Erro ao criar comanda.')
    expect(getNewTabOpenState()).toBe(true)
    expect(getNewTabDialogState(true)).toBeNull()
    expect(getNewTabDialogState(false)).toEqual({
      newTabLabel: '',
      newTabNotes: '',
      formError: '',
    })
    expect(getTabDetailsDialogState(true)).toBeUndefined()
    expect(getTabDetailsDialogState(false)).toBeNull()
    expect(getClosedTabSelectionState()).toBeNull()
  })
})
