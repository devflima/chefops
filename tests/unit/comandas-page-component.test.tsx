import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useTabsMock = vi.fn()
const useCloseTabMock = vi.fn()
const useCreateTabMock = vi.fn()

let capturedHeaderProps: Record<string, unknown> | null = null
let capturedGridProps: Record<string, unknown> | null = null
let capturedTabDetailsDialogProps: Record<string, unknown> | null = null
let capturedNewTabDialogProps: Record<string, unknown> | null = null
let capturedEmptyStateProps: Record<string, unknown> | null = null

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@/features/tabs/hooks/useTabs', () => ({
  useTabs: (...args: Parameters<typeof useTabsMock>) => useTabsMock(...args),
  useCloseTab: () => useCloseTabMock(),
  useCreateTab: () => useCreateTabMock(),
}))

vi.mock('@/features/tabs/TabsDashboardHeader', () => ({
  TabsDashboardHeader: (props: Record<string, unknown>) => {
    capturedHeaderProps = props
    return React.createElement('div', null, 'Tabs Dashboard Header Mock')
  },
}))

vi.mock('@/features/tabs/TabsDashboardGrid', () => ({
  TabsDashboardGrid: (props: Record<string, unknown>) => {
    capturedGridProps = props
    return React.createElement('div', null, 'Tabs Dashboard Grid Mock')
  },
}))

vi.mock('@/features/tabs/TabsDashboardEmptyState', () => ({
  TabsDashboardEmptyState: (props: Record<string, unknown>) => {
    capturedEmptyStateProps = props
    return React.createElement('div', null, 'Tabs Dashboard Empty State Mock')
  },
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

describe('ComandasPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedHeaderProps = null
    capturedGridProps = null
    capturedTabDetailsDialogProps = null
    capturedNewTabDialogProps = null
    capturedEmptyStateProps = null

    useTabsMock.mockImplementation((status: 'open' | 'closed') => {
      if (status === 'open') {
        return {
          data: [
            {
              id: 'tab-1',
              label: 'C-10',
              status: 'open',
              total: 42,
              orders: [{ id: 'order-1', total: 42, status: 'confirmed' }],
            },
          ],
          isLoading: false,
        }
      }

      return {
        data: [
          {
            id: 'tab-2',
            label: 'C-11',
            status: 'closed',
            total: 18,
            orders: [],
          },
        ],
        isLoading: false,
      }
    })
    useCloseTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useCreateTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    vi.stubGlobal('window', {
      confirm: vi.fn(() => true),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais da página', async () => {
    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')

    expect(renderToStaticMarkup(React.createElement(ComandasPage))).toContain('Tabs Dashboard Header Mock')
    expect(capturedHeaderProps).toBeTruthy()
    expect(capturedGridProps).toBeTruthy()
    expect(capturedTabDetailsDialogProps).toBeTruthy()
    expect(capturedNewTabDialogProps).toBeTruthy()

    const headerProps = capturedHeaderProps as {
      openCount: number
      closedCount: number
      onCreate: () => void
    }
    const gridProps = capturedGridProps as {
      tabs: Array<{ id: string; label: string }>
      onSelect: (tab: { id: string; label: string }) => void
      onClose: (tab: { id: string; label: string; total: number; orders: Array<{ total: number; status: string }> }) => Promise<void>
    }
    const detailsProps = capturedTabDetailsDialogProps as {
      selectedTab: { id: string; label: string } | null
      onOpenChange: (open: boolean) => void
      onCloseTab: (tab: { id: string; label: string; total: number; orders: Array<{ total: number; status: string }> }) => Promise<void>
    }
    const newTabDialogProps = capturedNewTabDialogProps as {
      open: boolean
      newTabLabel: string
      newTabNotes: string
      formError: string
      onOpenChange: (open: boolean) => void
      onLabelChange: (value: string) => void
      onNotesChange: (value: string) => void
      onSubmit: () => Promise<void>
    }

    expect(headerProps.openCount).toBe(1)
    expect(headerProps.closedCount).toBe(1)
    expect(gridProps.tabs).toEqual([
      {
        id: 'tab-1',
        label: 'C-10',
        status: 'open',
        total: 42,
        orders: [{ id: 'order-1', total: 42, status: 'confirmed' }],
      },
    ])

    headerProps.onCreate()
    gridProps.onSelect({ id: 'tab-1', label: 'C-10' })

    const closeTabMutateAsync = useCloseTabMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    const createTabMutateAsync = useCreateTabMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    await gridProps.onClose({
      id: 'tab-1',
      label: 'C-10',
      total: 42,
      orders: [{ total: 42, status: 'confirmed' }],
    })
    await detailsProps.onCloseTab({
      id: 'tab-1',
      label: 'C-10',
      total: 42,
      orders: [{ total: 42, status: 'confirmed' }],
    })

    newTabDialogProps.onOpenChange(false)
    newTabDialogProps.onLabelChange('Balcao 3')
    newTabDialogProps.onNotesChange('Mesa da janela')
    await newTabDialogProps.onSubmit()

    expect(window.confirm).toHaveBeenCalledWith('Fechar a comanda C-10?\nTotal atual: R$ 42.00')
    expect(closeTabMutateAsync).toHaveBeenCalledWith('tab-1')
    expect(createTabMutateAsync).not.toHaveBeenCalled()
  })

  it('renderiza estado vazio quando não há comandas abertas', async () => {
    useTabsMock.mockImplementation((status: 'open' | 'closed') => ({
      data: status === 'open' ? [] : [],
      isLoading: false,
    }))

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')

    expect(renderToStaticMarkup(React.createElement(ComandasPage))).toContain('Tabs Dashboard Empty State Mock')
    expect(capturedEmptyStateProps).toBeTruthy()

    const emptyStateProps = capturedEmptyStateProps as {
      onCreate: () => void
    }

    emptyStateProps.onCreate()

    expect(capturedNewTabDialogProps).toBeTruthy()
  })

  it('cobre cancelamento de fechamento, validação e erro de criação', async () => {
    const closeTabMutateAsync = vi.fn().mockResolvedValue(undefined)
    const createTabMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao criar comanda'))

    useCloseTabMock.mockReturnValue({
      isPending: false,
      mutateAsync: closeTabMutateAsync,
    })
    useCreateTabMock.mockReturnValue({
      isPending: true,
      mutateAsync: createTabMutateAsync,
    })
    ;(window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')
    renderToStaticMarkup(React.createElement(ComandasPage))

    const headerProps = capturedHeaderProps as {
      onCreate: () => void
    }
    const gridProps = capturedGridProps as {
      onClose: (tab: { id: string; label: string; total: number; orders: Array<{ total: number; status: string }> }) => Promise<void>
    }
    const newTabDialogProps = capturedNewTabDialogProps as {
      isCreating: boolean
      formError: string
      onLabelChange: (value: string) => void
      onNotesChange: (value: string) => void
      onSubmit: () => Promise<void>
      onOpenChange: (open: boolean) => void
    }

    expect(newTabDialogProps.isCreating).toBe(true)
    expect(newTabDialogProps.formError).toBe('')

    await gridProps.onClose({
      id: 'tab-1',
      label: 'C-10',
      total: 42,
      orders: [{ total: 42, status: 'confirmed' }],
    })

    expect(closeTabMutateAsync).not.toHaveBeenCalled()

    headerProps.onCreate()
    newTabDialogProps.onLabelChange('   ')
    await newTabDialogProps.onSubmit()

    expect(createTabMutateAsync).not.toHaveBeenCalled()

    newTabDialogProps.onOpenChange(false)
  })
})
