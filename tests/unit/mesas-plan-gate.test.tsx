import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useTablesMock = vi.fn()
const useCreateTableMock = vi.fn()
const useUpdateTableMock = vi.fn()
const useDeleteTableMock = vi.fn()
const useOpenSessionMock = vi.fn()
const useCloseSessionMock = vi.fn()
const usePlanMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const useHasFeatureMock = vi.fn()

vi.mock('@/features/tables/hooks/useTables', () => ({
  useTables: () => useTablesMock(),
  useCreateTable: () => useCreateTableMock(),
  useUpdateTable: () => useUpdateTableMock(),
  useDeleteTable: () => useDeleteTableMock(),
  useOpenSession: () => useOpenSessionMock(),
  useCloseSession: () => useCloseSessionMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
  useCanAddMore: (...args: Parameters<typeof useCanAddMoreMock>) => useCanAddMoreMock(...args),
  useHasFeature: (...args: Parameters<typeof useHasFeatureMock>) => useHasFeatureMock(...args),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormControl: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormField: ({ render }: { render: (args: { field: Record<string, unknown> }) => React.ReactNode }) =>
    React.createElement(React.Fragment, null, render({ field: { value: '', onChange: vi.fn() } })),
  FormItem: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) => React.createElement('label', null, children),
  FormMessage: () => React.createElement('span', null, 'form-message'),
}))

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    formState: { isSubmitting: false, errors: {} },
    reset: vi.fn(),
    setError: vi.fn(),
    handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => () => callback({}),
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

vi.mock('@/features/tables/TablesDashboardHeader', () => ({
  TablesDashboardHeader: () => React.createElement('div', null, 'header'),
}))

vi.mock('@/features/tables/TablesDashboardGrid', () => ({
  TablesDashboardGrid: () => React.createElement('div', null, 'grid'),
}))

vi.mock('@/features/tables/TablesDashboardEmptyState', () => ({
  TablesDashboardEmptyState: () => React.createElement('div', null, 'empty'),
}))

vi.mock('@/features/tables/TableSessionDetailsDialog', () => ({
  TableSessionDetailsDialog: () => React.createElement('div', null, 'details'),
}))

vi.mock('@/features/tables/OpenSessionDialog', () => ({
  OpenSessionDialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
}))

vi.mock('@/features/tables/TableFormDialog', () => ({
  TableFormDialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
}))

describe('Mesas page plan gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTablesMock.mockReturnValue({ data: [], isLoading: false })
    useCreateTableMock.mockReturnValue({ mutateAsync: vi.fn() })
    useUpdateTableMock.mockReturnValue({ mutateAsync: vi.fn() })
    useDeleteTableMock.mockReturnValue({ mutateAsync: vi.fn() })
    useOpenSessionMock.mockReturnValue({ mutateAsync: vi.fn() })
    useCloseSessionMock.mockReturnValue({ mutateAsync: vi.fn() })
    usePlanMock.mockReturnValue({ data: { plan: 'free', max_tables: 0, features: ['orders', 'menu', 'payments', 'team'] } })
    useCanAddMoreMock.mockReturnValue(false)
  })

  it('mostra bloqueio quando o plano não inclui mesas', async () => {
    useHasFeatureMock.mockReturnValue(false)

    const { default: MesasPage } = await import('@/app/(dashboard)/mesas/page')
    const markup = renderToStaticMarkup(React.createElement(MesasPage))

    expect(markup).toContain('Recurso não disponível')
    expect(markup).toContain('Ver planos disponíveis')
    expect(markup).not.toContain('header')
    expect(markup).not.toContain('grid')
  })
})
