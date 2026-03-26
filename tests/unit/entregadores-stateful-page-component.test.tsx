import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useUserMock = vi.fn()
const useDeliveryDriversMock = vi.fn()
const useCreateDeliveryDriverMock = vi.fn()
const useUpdateDeliveryDriverMock = vi.fn()
const useDeleteDeliveryDriverMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []
let capturedDeliveryDriversPageContentProps: Record<string, unknown> | null = null

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => useStateMock(initial),
  }
})

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliveryDrivers', () => ({
  useDeliveryDrivers: () => useDeliveryDriversMock(),
  useCreateDeliveryDriver: () => useCreateDeliveryDriverMock(),
  useUpdateDeliveryDriver: () => useUpdateDeliveryDriverMock(),
  useDeleteDeliveryDriver: () => useDeleteDeliveryDriverMock(),
}))

vi.mock('@/features/delivery/DeliveryDriversPageContent', () => ({
  DeliveryDriversPageContent: (props: Record<string, unknown>) => {
    capturedDeliveryDriversPageContentProps = props
    return React.createElement('div', null, 'Delivery Drivers Stateful Content Mock')
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: Parameters<typeof toastSuccessMock>) => toastSuccessMock(...args),
    error: (...args: Parameters<typeof toastErrorMock>) => toastErrorMock(...args),
  },
}))

describe('EntregadoresPage stateful branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateValues = []
    stateSetters = []
    capturedDeliveryDriversPageContentProps = null

    useStateMock.mockImplementation((initial: unknown) => {
      const setter = vi.fn()
      const index = stateSetters.length
      stateSetters.push(setter)
      return [index in stateValues ? stateValues[index] : initial, setter]
    })

    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'owner',
        },
      },
    })
    useDeliveryDriversMock.mockReturnValue({
      data: [
        {
          id: 'driver-1',
          name: 'Carlos',
          phone: '11999999999',
          vehicle_type: 'moto',
          notes: 'Turno noite',
          active: true,
        },
      ],
      isLoading: false,
    })
    useCreateDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useUpdateDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useDeleteDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })

    vi.stubGlobal('window', {
      confirm: vi.fn(() => true),
    })
  })

  it('cobre edição, criação e remoção com estado já preenchido', async () => {
    stateValues[0] = true
    stateValues[1] = {
      id: 'driver-1',
      name: 'Carlos',
      phone: '11999999999',
      vehicle_type: 'moto',
      notes: 'Turno noite',
      active: true,
    }
    stateValues[2] = 'Carlos Atualizado'
    stateValues[3] = '11999990000'
    stateValues[4] = 'bike'
    stateValues[5] = 'Centro'
    stateValues[6] = false

    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')

    expect(renderToStaticMarkup(React.createElement(EntregadoresPage))).toContain(
      'Delivery Drivers Stateful Content Mock'
    )

    const props = capturedDeliveryDriversPageContentProps as {
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
      onDelete: (driver: { id: string; name: string }) => Promise<void>
    }

    await props.onSubmit({ preventDefault: vi.fn() })
    await props.onDelete({ id: 'driver-1', name: 'Carlos' })

    const updateMutateAsync = useUpdateDeliveryDriverMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>
    const deleteMutateAsync = useDeleteDeliveryDriverMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'driver-1',
      name: 'Carlos Atualizado',
      phone: '11999990000',
      vehicle_type: 'bike',
      active: false,
      notes: 'Centro',
    })
    expect(deleteMutateAsync).toHaveBeenCalledWith('driver-1')
    expect(toastSuccessMock).toHaveBeenCalledWith('Entregador atualizado com sucesso.')
    expect(toastSuccessMock).toHaveBeenCalledWith('Entregador removido com sucesso.')
  })

  it('cobre criação e erros genéricos de salvar/remover', async () => {
    stateValues[0] = true
    stateValues[1] = null
    stateValues[2] = 'Novo Entregador'
    stateValues[3] = '11999990000'
    stateValues[4] = 'carro'
    stateValues[5] = 'Norte'
    stateValues[6] = true

    useCreateDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockRejectedValue('falha'),
    })
    useDeleteDeliveryDriverMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockRejectedValue('falha'),
    })

    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')

    renderToStaticMarkup(React.createElement(EntregadoresPage))

    const props = capturedDeliveryDriversPageContentProps as {
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
      onDelete: (driver: { id: string; name: string }) => Promise<void>
    }

    await props.onSubmit({ preventDefault: vi.fn() })
    await props.onDelete({ id: 'driver-1', name: 'Carlos' })

    const createMutateAsync = useCreateDeliveryDriverMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    expect(createMutateAsync).toHaveBeenCalledWith({
      name: 'Novo Entregador',
      phone: '11999990000',
      vehicle_type: 'carro',
      active: true,
      notes: 'Norte',
    })
    expect(toastErrorMock).toHaveBeenCalledWith('Não foi possível salvar o entregador.')
    expect(toastErrorMock).toHaveBeenCalledWith('Erro ao remover entregador.')
  })

  it('cobre falta de permissão, confirmação abortada e edição com campos opcionais vazios', async () => {
    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'cashier',
        },
      },
    })
    useDeliveryDriversMock.mockReturnValue({
      data: [
        {
          id: 'driver-1',
          name: 'Carlos',
          phone: null,
          vehicle_type: 'moto',
          notes: null,
          active: false,
        },
      ],
      isLoading: false,
    })

    const confirmMock = vi.fn(() => false)
    vi.stubGlobal('window', { confirm: confirmMock })

    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')

    renderToStaticMarkup(React.createElement(EntregadoresPage))

    const props = capturedDeliveryDriversPageContentProps as {
      canManage: boolean
      activeDrivers: number
      openEdit: (driver: {
        id: string
        name: string
        phone: string | null
        vehicle_type: 'moto' | 'bike' | 'carro'
        notes: string | null
        active: boolean
      }) => void
      onDelete: (driver: { id: string; name: string }) => Promise<void>
    }

    expect(props.canManage).toBe(false)
    expect(props.activeDrivers).toBe(0)

    props.openEdit({
      id: 'driver-1',
      name: 'Carlos',
      phone: null,
      vehicle_type: 'moto',
      notes: null,
      active: false,
    })
    await props.onDelete({ id: 'driver-1', name: 'Carlos' })

    expect(stateSetters[1]).toHaveBeenCalledWith({
      id: 'driver-1',
      name: 'Carlos',
      phone: null,
      vehicle_type: 'moto',
      notes: null,
      active: false,
    })
    expect(stateSetters[2]).toHaveBeenCalledWith('Carlos')
    expect(stateSetters[3]).toHaveBeenCalledWith('')
    expect(stateSetters[4]).toHaveBeenCalledWith('moto')
    expect(stateSetters[5]).toHaveBeenCalledWith('')
    expect(stateSetters[6]).toHaveBeenCalledWith(false)
    expect(stateSetters[0]).toHaveBeenCalledWith(true)

    const deleteMutateAsync = useDeleteDeliveryDriverMock.mock.results[0]?.value
      .mutateAsync as ReturnType<typeof vi.fn>
    expect(confirmMock).toHaveBeenCalledWith('Remover o entregador "Carlos"?')
    expect(deleteMutateAsync).not.toHaveBeenCalled()
  })

  it('cobre fallbacks com usuário ausente e lista de entregadores indefinida', async () => {
    useUserMock.mockReturnValue({
      user: null,
    })
    useDeliveryDriversMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')

    renderToStaticMarkup(React.createElement(EntregadoresPage))

    const props = capturedDeliveryDriversPageContentProps as {
      canManage: boolean
      activeDrivers: number
      isLoading: boolean
      drivers: undefined
    }

    expect(props.canManage).toBe(false)
    expect(props.activeDrivers).toBe(0)
    expect(props.isLoading).toBe(true)
    expect(props.drivers).toBeUndefined()
  })
})
