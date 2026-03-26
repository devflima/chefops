import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useTabsMock = vi.fn()
const useCloseTabMock = vi.fn()
const useCreateTabMock = vi.fn()

let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []
let capturedNewTabDialogProps: Record<string, unknown> | null = null
let capturedGridProps: Record<string, unknown> | null = null
let capturedTabDetailsDialogProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
  }
})

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@/features/tabs/hooks/useTabs', () => ({
  useTabs: (...args: Parameters<typeof useTabsMock>) => useTabsMock(...args),
  useCloseTab: () => useCloseTabMock(),
  useCreateTab: () => useCreateTabMock(),
}))

vi.mock('@/features/tabs/TabsDashboardHeader', () => ({
  TabsDashboardHeader: () => React.createElement('div', null, 'Tabs Dashboard Header Mock'),
}))

vi.mock('@/features/tabs/TabsDashboardGrid', () => ({
  TabsDashboardGrid: (props: Record<string, unknown>) => {
    capturedGridProps = props
    return React.createElement('div', null, 'Tabs Dashboard Grid Mock')
  },
}))

vi.mock('@/features/tabs/TabsDashboardEmptyState', () => ({
  TabsDashboardEmptyState: () => React.createElement('div', null, 'Tabs Dashboard Empty State Mock'),
}))

vi.mock('@/features/tabs/TabDetailsDialog', () => ({
  TabDetailsDialog: (props: Record<string, unknown>) => {
    capturedTabDetailsDialogProps = props
    return React.createElement('div', null, 'Tab Details Dialog Mock')
  },
}))

vi.mock('@/features/tabs/NewTabDialog', () => ({
  NewTabDialog: (props: Record<string, unknown>) => {
    capturedNewTabDialogProps = props
    return React.createElement('div', null, 'New Tab Dialog Mock')
  },
}))

describe('ComandasPage stateful branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateValues = []
    stateSetters = []
    capturedNewTabDialogProps = null
    capturedGridProps = null
    capturedTabDetailsDialogProps = null

    useStateMock.mockImplementation((initial: unknown) => {
      const setter = vi.fn()
      const index = stateSetters.length
      stateSetters.push(setter)
      return [index in stateValues ? stateValues[index] : initial, setter]
    })

    useTabsMock.mockReturnValue({
      data: [],
      isLoading: false,
    })
    useCloseTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    useCreateTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('submete criação com label e notas já preenchidos no estado', async () => {
    stateValues[0] = true
    stateValues[2] = '  Balcao 3  '
    stateValues[3] = '  Mesa da janela  '

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')

    expect(renderToStaticMarkup(React.createElement(ComandasPage))).toContain('New Tab Dialog Mock')

    const props = capturedNewTabDialogProps as {
      onSubmit: () => Promise<void>
    }

    await props.onSubmit()

    const createTabMutateAsync = useCreateTabMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(createTabMutateAsync).toHaveBeenCalledWith({
      label: 'Balcao 3',
      notes: 'Mesa da janela',
    })
  })

  it('reseta estado do modal ao fechar e aborta fechamento da comanda', async () => {
    stateValues[0] = true
    stateValues[1] = {
      id: 'tab-1',
      label: 'Mesa 7',
      total: 50,
    }
    stateValues[2] = 'Mesa 7'
    stateValues[3] = 'Observação'
    stateValues[4] = 'Erro'

    useTabsMock
      .mockReturnValueOnce({
        data: [
          {
            id: 'tab-1',
            label: 'Mesa 7',
            total: 50,
            notes: 'Observação',
          },
        ],
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
      })

    const closeTabMutateAsync = vi.fn()
    useCloseTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: closeTabMutateAsync,
    })
    vi.stubGlobal('window', { confirm: vi.fn(() => false) })

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')

    renderToStaticMarkup(React.createElement(ComandasPage))

    const dialogProps = capturedNewTabDialogProps as {
      onOpenChange: (open: boolean) => void
    }
    const gridProps = capturedGridProps as {
      onClose: (tab: { id: string; label: string; total: number }) => Promise<void>
    }
    const detailsProps = capturedTabDetailsDialogProps as {
      onOpenChange: (open: boolean) => void
      onCloseTab: (tab: { id: string; label: string; total: number }) => Promise<void>
    }

    dialogProps.onOpenChange(false)
    detailsProps.onOpenChange(false)
    await gridProps.onClose({ id: 'tab-1', label: 'Mesa 7', total: 50 })
    await detailsProps.onCloseTab({ id: 'tab-1', label: 'Mesa 7', total: 50 })

    expect(stateSetters[0]).toHaveBeenCalledWith(false)
    expect(stateSetters[2]).toHaveBeenCalledWith('')
    expect(stateSetters[3]).toHaveBeenCalledWith('')
    expect(stateSetters[4]).toHaveBeenCalledWith('')
    expect(stateSetters[1]).toHaveBeenCalledWith(null)
    expect(closeTabMutateAsync).not.toHaveBeenCalled()
  })

  it('mantém estado quando diálogos seguem abertos e renderiza loading', async () => {
    useTabsMock
      .mockReturnValueOnce({
        data: [],
        isLoading: true,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
      })

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')

    const markup = renderToStaticMarkup(React.createElement(ComandasPage))

    expect(markup).toContain('Carregando comandas...')
    expect(capturedNewTabDialogProps).toBeTruthy()
    expect(capturedTabDetailsDialogProps).toBeTruthy()

    const dialogProps = capturedNewTabDialogProps as {
      onOpenChange: (open: boolean) => void
    }
    const detailsProps = capturedTabDetailsDialogProps as {
      onOpenChange: (open: boolean) => void
    }

    dialogProps.onOpenChange(true)
    detailsProps.onOpenChange(true)

    expect(stateSetters[0]).toHaveBeenCalledWith(true)
    expect(stateSetters[2]).not.toHaveBeenCalledWith('')
    expect(stateSetters[3]).not.toHaveBeenCalledWith('')
    expect(stateSetters[4]).not.toHaveBeenCalledWith('')
    expect(stateSetters[1]).not.toHaveBeenCalled()
  })

  it('usa mensagem genérica ao falhar criar comanda com erro não-Error', async () => {
    stateValues[0] = true
    stateValues[2] = 'Balcao 9'
    stateValues[3] = 'Pedido rápido'

    useCreateTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockRejectedValue('falha'),
    })

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')

    renderToStaticMarkup(React.createElement(ComandasPage))

    const dialogProps = capturedNewTabDialogProps as {
      onSubmit: () => Promise<void>
    }

    await dialogProps.onSubmit()

    expect(stateSetters[4]).toHaveBeenCalledWith('')
    expect(stateSetters[4]).toHaveBeenCalledWith('Erro ao criar comanda.')
  })
})
