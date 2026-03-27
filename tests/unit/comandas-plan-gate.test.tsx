import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useTabsMock = vi.fn()
const useCloseTabMock = vi.fn()
const useCreateTabMock = vi.fn()
const useHasFeatureMock = vi.fn()

vi.mock('@/features/tabs/hooks/useTabs', () => ({
  useTabs: (...args: Parameters<typeof useTabsMock>) => useTabsMock(...args),
  useCloseTab: () => useCloseTabMock(),
  useCreateTab: () => useCreateTabMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', async () => {
  const actual = await vi.importActual<typeof import('@/features/plans/hooks/usePlan')>(
    '@/features/plans/hooks/usePlan'
  )
  return {
    ...actual,
    useHasFeature: (...args: Parameters<typeof useHasFeatureMock>) => useHasFeatureMock(...args),
  }
})

vi.mock('@/features/tabs/TabsDashboardHeader', () => ({
  TabsDashboardHeader: () => React.createElement('div', null, 'header'),
}))

vi.mock('@/features/tabs/TabsDashboardGrid', () => ({
  TabsDashboardGrid: () => React.createElement('div', null, 'grid'),
}))

vi.mock('@/features/tabs/TabsDashboardEmptyState', () => ({
  TabsDashboardEmptyState: () => React.createElement('div', null, 'empty'),
}))

vi.mock('@/features/tabs/TabDetailsDialog', () => ({
  TabDetailsDialog: () => React.createElement('div', null, 'details'),
}))

vi.mock('@/features/tabs/NewTabDialog', () => ({
  NewTabDialog: () => React.createElement('div', null, 'dialog'),
}))

describe('Comandas page plan gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTabsMock.mockReturnValue({ data: [], isLoading: false })
    useCloseTabMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    useCreateTabMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('mostra bloqueio quando o plano não inclui comandas/mesas', async () => {
    useHasFeatureMock.mockReturnValue(false)

    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')
    const markup = renderToStaticMarkup(React.createElement(ComandasPage))

    expect(markup).toContain('Recurso não disponível')
    expect(markup).toContain('Ver planos disponíveis')
    expect(markup).not.toContain('header')
    expect(markup).not.toContain('grid')
  })
})
