import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useTablesMock = vi.fn()
const useCreateTableMock = vi.fn()
const useUpdateTableMock = vi.fn()
const useDeleteTableMock = vi.fn()
const useOpenSessionMock = vi.fn()
const useCloseSessionMock = vi.fn()
const usePlanMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const tableFormResetMock = vi.fn()
const tableFormSetErrorMock = vi.fn()
const sessionFormResetMock = vi.fn()
const sessionFormSetErrorMock = vi.fn()

let capturedHeaderProps: Record<string, unknown> | null = null
let capturedGridProps: Record<string, unknown> | null = null
let capturedEmptyStateProps: Record<string, unknown> | null = null
let capturedTableSessionDialogProps: Record<string, unknown> | null = null
let capturedOpenSessionDialogProps: Record<string, unknown> | null = null
let capturedTableFormDialogProps: Record<string, unknown> | null = null
let capturedTableFormDialogChildren: React.ReactNode = null
let capturedOpenSessionDialogChildren: React.ReactNode = null

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
  useForm: (options?: { defaultValues?: Record<string, unknown> }) => {
    const defaultValues = options?.defaultValues ?? {}
    const isTableForm = Object.prototype.hasOwnProperty.call(defaultValues, 'capacity')

    return {
      control: {},
      formState: { isSubmitting: false, errors: {} },
      reset: isTableForm ? tableFormResetMock : sessionFormResetMock,
      setError: isTableForm ? tableFormSetErrorMock : sessionFormSetErrorMock,
      handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => () => callback(defaultValues),
    }
  },
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

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
}))

vi.mock('@/features/tables/TablesDashboardHeader', () => ({
  TablesDashboardHeader: (props: Record<string, unknown>) => {
    capturedHeaderProps = props
    return React.createElement('div', null, 'Tables Dashboard Header Mock')
  },
}))

vi.mock('@/features/tables/TablesDashboardGrid', () => ({
  TablesDashboardGrid: (props: Record<string, unknown>) => {
    capturedGridProps = props
    return React.createElement('div', null, 'Tables Dashboard Grid Mock')
  },
}))

vi.mock('@/features/tables/TablesDashboardEmptyState', () => ({
  TablesDashboardEmptyState: (props: Record<string, unknown>) => {
    capturedEmptyStateProps = props
    return React.createElement('div', null, 'Tables Dashboard Empty State Mock')
  },
}))

vi.mock('@/features/tables/TableSessionDetailsDialog', () => ({
  TableSessionDetailsDialog: (props: Record<string, unknown>) => {
    capturedTableSessionDialogProps = props
    return React.createElement('div', null, 'Table Session Details Dialog Mock')
  },
}))

vi.mock('@/features/tables/OpenSessionDialog', () => ({
  OpenSessionDialog: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    capturedOpenSessionDialogProps = props
    capturedOpenSessionDialogChildren = children
    return React.createElement('div', null, 'Open Session Dialog Mock', children)
  },
}))

vi.mock('@/features/tables/TableFormDialog', () => ({
  TableFormDialog: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    capturedTableFormDialogProps = props
    capturedTableFormDialogChildren = children
    return React.createElement('div', null, 'Table Form Dialog Mock', children)
  },
}))

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (!node || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap(flattenElements)
  }

  if (!React.isValidElement(node)) {
    return []
  }

  return [node, ...flattenElements(node.props.children)]
}

function getFormSubmitHandler(node: React.ReactNode, index = 0) {
  const forms = flattenElements(node).filter((element) => element.type === 'form')
  return forms[index]?.props.onSubmit as (() => unknown) | undefined
}

describe('MesasPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStateMock.mockImplementation((initial: unknown) => [initial, vi.fn()])
    capturedHeaderProps = null
    capturedGridProps = null
    capturedEmptyStateProps = null
    capturedTableSessionDialogProps = null
    capturedOpenSessionDialogProps = null
    capturedTableFormDialogProps = null
    capturedTableFormDialogChildren = null
    capturedOpenSessionDialogChildren = null

    useTablesMock.mockReturnValue({
      data: [
        {
          id: 'table-1',
          number: '10',
          capacity: 4,
          status: 'occupied',
          active_session: {
            id: 'session-1',
            total: 42,
            orders: [{ id: 'order-1', total: 42, status: 'confirmed' }],
          },
        },
      ],
      isLoading: false,
    })
    useCreateTableMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) })
    useUpdateTableMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) })
    useDeleteTableMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) })
    useOpenSessionMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) })
    useCloseSessionMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) })
    usePlanMock.mockReturnValue({
      data: {
        max_tables: 10,
      },
    })
    useCanAddMoreMock.mockReturnValue(true)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: 'https://chefops.test/qr/table-1' }),
    }))
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('window', { confirm: vi.fn(() => true) })
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta props e aciona handlers principais da página', async () => {
    const { default: MesasPage } = await import('@/app/(dashboard)/mesas/page')

    expect(renderToStaticMarkup(React.createElement(MesasPage))).toContain('Tables Dashboard Header Mock')
    expect(capturedHeaderProps).toBeTruthy()
    expect(capturedGridProps).toBeTruthy()
    expect(capturedTableSessionDialogProps).toBeTruthy()
    expect(capturedTableFormDialogProps).toBeTruthy()
    expect(capturedOpenSessionDialogProps).toBeTruthy()

    const headerProps = capturedHeaderProps as {
      occupied: number
      available: number
      tableCount: number
      maxTables?: number
      tableLimitReached: boolean
    }
    const gridProps = capturedGridProps as {
      tables: Array<{ id: string; number: string }>
      onEdit: (table: { id: string; number: string; capacity: number }) => void
      onDelete: (table: { id: string; number: string }) => Promise<void>
      onCopyQr: (table: { id: string }) => Promise<void>
      onCloseSession: (table: { number: string; active_session: { id: string; total: number } }) => Promise<void>
    }
    const dialogProps = capturedTableSessionDialogProps as {
      onOpenChange: (open: boolean) => void
      onCloseSession: (table: { number: string; active_session: { id: string; total: number } }) => Promise<void>
    }

    expect(headerProps.occupied).toBe(1)
    expect(headerProps.available).toBe(0)
    expect(headerProps.tableCount).toBe(1)
    expect(headerProps.maxTables).toBe(10)
    expect(headerProps.tableLimitReached).toBe(false)
    expect(gridProps.tables).toEqual([
      {
        id: 'table-1',
        number: '10',
        capacity: 4,
        status: 'occupied',
        active_session: {
          id: 'session-1',
          total: 42,
          orders: [{ id: 'order-1', total: 42, status: 'confirmed' }],
        },
      },
    ])

    gridProps.onEdit({ id: 'table-1', number: '10', capacity: 4 })
    await gridProps.onDelete({ id: 'table-1', number: '10' })
    await gridProps.onCopyQr({ id: 'table-1' })
    await gridProps.onCloseSession({
      number: '10',
      active_session: { id: 'session-1', total: 42 },
    })
    dialogProps.onOpenChange(false)
    await dialogProps.onCloseSession({
      number: '10',
      active_session: { id: 'session-1', total: 42 },
    })

    const deleteMutateAsync = useDeleteTableMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    const closeSessionMutateAsync = useCloseSessionMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(tableFormResetMock).toHaveBeenCalledWith({ number: '10', capacity: 4 })
    expect(confirm).toHaveBeenCalledWith('Excluir a Mesa 10? Esta ação não pode ser desfeita.')
    expect(deleteMutateAsync).toHaveBeenCalledWith('table-1')
    expect(fetch).toHaveBeenCalledWith('/api/tables/qrcode-url?table_id=table-1')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://chefops.test/qr/table-1')
    expect(alert).toHaveBeenCalledWith('URL copiada!\nhttps://chefops.test/qr/table-1')
    expect(window.confirm).toHaveBeenCalledWith('Fechar comanda da Mesa 10?\nTotal: R$ 42.00')
    expect(closeSessionMutateAsync).toHaveBeenCalledWith('session-1')
  })

  it('renderiza estado vazio quando não há mesas', async () => {
    useTablesMock.mockReturnValue({
      data: [],
      isLoading: false,
    })

    const { default: MesasPage } = await import('@/app/(dashboard)/mesas/page')

    expect(renderToStaticMarkup(React.createElement(MesasPage))).toContain('Tables Dashboard Empty State Mock')
    expect(capturedEmptyStateProps).toBeTruthy()
  })

  it('submete criação e abertura de comanda com sucesso pelo componente real', async () => {
    const setNewTableOpenMock = vi.fn()
    const setOpenSessionModalMock = vi.fn()

    useStateMock
      .mockImplementationOnce((initial: unknown) => [initial, setNewTableOpenMock])
      .mockImplementationOnce(() => [{
        id: 'table-1',
        number: '10',
        capacity: 4,
        status: 'available',
        active_session: null,
      }, setOpenSessionModalMock])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])

    const { default: MesasPage } = await import('@/app/(dashboard)/mesas/page')

    renderToStaticMarkup(React.createElement(MesasPage))

    const tableSubmit = getFormSubmitHandler(capturedTableFormDialogChildren)
    const sessionSubmit = getFormSubmitHandler(capturedOpenSessionDialogChildren)

    expect(tableSubmit).toBeTypeOf('function')
    expect(sessionSubmit).toBeTypeOf('function')

    await tableSubmit?.()
    await sessionSubmit?.()

    const createTableMutateAsync = useCreateTableMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    const openSessionMutateAsync = useOpenSessionMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(createTableMutateAsync).toHaveBeenCalledWith({ number: '', capacity: 4 })
    expect(setNewTableOpenMock).toHaveBeenCalledWith(false)
    expect(tableFormResetMock).toHaveBeenCalled()

    expect(openSessionMutateAsync).toHaveBeenCalledWith({
      table_id: 'table-1',
      customer_count: 1,
    })
    expect(setOpenSessionModalMock).toHaveBeenCalledWith(null)
    expect(sessionFormResetMock).toHaveBeenCalled()
  })

  it('submete edição, trata erro de criação e usa fallback para copiar QR', async () => {
    const setEditingTableMock = vi.fn()
    const setCreateDialogOpenMock = vi.fn()
    const createError = new Error('Falha ao criar')

    useCreateTableMock.mockReturnValue({ mutateAsync: vi.fn().mockRejectedValue(createError) })
    useUpdateTableMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) })

    useStateMock
      .mockImplementationOnce(() => [true, setCreateDialogOpenMock])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce((initial: unknown) => [initial, vi.fn()])
      .mockImplementationOnce(() => [{
        id: 'table-1',
        number: '10',
        capacity: 4,
      }, setEditingTableMock])

    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('clipboard denied')),
      },
    })

    const createElementMock = vi.fn(() => ({
      value: '',
      style: {},
      focus: vi.fn(),
      select: vi.fn(),
    }))
    const appendChildMock = vi.fn()
    const removeChildMock = vi.fn()
    const execCommandMock = vi.fn(() => true)
    vi.stubGlobal('document', {
      createElement: createElementMock,
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock,
      },
      execCommand: execCommandMock,
    })

    const { default: MesasPage } = await import('@/app/(dashboard)/mesas/page')

    renderToStaticMarkup(React.createElement(MesasPage))

    const tableSubmit = getFormSubmitHandler(capturedTableFormDialogChildren)
    expect(tableSubmit).toBeTypeOf('function')

    await tableSubmit?.()

    const updateTableMutateAsync = useUpdateTableMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(updateTableMutateAsync).toHaveBeenCalledWith({
      id: 'table-1',
      number: '',
      capacity: 4,
    })
    expect(setEditingTableMock).toHaveBeenCalledWith(null)
    expect(tableFormResetMock).toHaveBeenCalled()

    useStateMock.mockImplementation((initial: unknown) => [initial, vi.fn()])
    const { default: MesasPageCreateError } = await import('@/app/(dashboard)/mesas/page')
    renderToStaticMarkup(React.createElement(MesasPageCreateError))
    await getFormSubmitHandler(capturedTableFormDialogChildren)?.()
    expect(tableFormSetErrorMock).toHaveBeenCalledWith('root', {
      message: 'Falha ao criar',
    })

    const gridProps = capturedGridProps as {
      onCopyQr: (table: { id: string }) => Promise<void>
    }
    await gridProps.onCopyQr({ id: 'table-1' })

    expect(createElementMock).toHaveBeenCalledWith('textarea')
    expect(appendChildMock).toHaveBeenCalled()
    expect(execCommandMock).toHaveBeenCalledWith('copy')
    expect(removeChildMock).toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith('URL copiada!\nhttps://chefops.test/qr/table-1')
  })
})
