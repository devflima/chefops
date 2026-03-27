import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useUserMock = vi.fn()
const useUsersMock = vi.fn()
const useCreateUserMock = vi.fn()
const useUpdateUserRoleMock = vi.fn()
const useDeleteUserMock = vi.fn()
const useStateMock = vi.fn()

let capturedUsersProps: Record<string, unknown> | null = null
let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []

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

vi.mock('@/features/users/hooks/useUsers', () => ({
  useUsers: () => useUsersMock(),
  useCreateUser: () => useCreateUserMock(),
  useUpdateUserRole: () => useUpdateUserRoleMock(),
  useDeleteUser: () => useDeleteUserMock(),
}))

vi.mock('@/features/users/UsersPageContent', () => ({
  UsersPageContent: (props: Record<string, unknown>) => {
    capturedUsersProps = props
    return React.createElement('div', null, 'Users Page Content Mock')
  },
}))

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('UsuariosPage stateful component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedUsersProps = null
    stateValues = []
    stateSetters = []

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

    useUsersMock.mockReturnValue({
      data: {
        current_user_id: 'user-1',
        users: [
          {
            id: 'user-1',
            full_name: 'Chef Ops',
            email: 'chef@ops.test',
            role: 'owner',
            created_at: '2026-03-21T00:00:00.000Z',
          },
          {
            id: 'user-2',
            full_name: 'Atendente',
            email: 'cashier@ops.test',
            role: 'cashier',
            created_at: '2026-03-20T00:00:00.000Z',
          },
        ],
        counts: {
          owner: 1,
          manager: 0,
          cashier: 1,
          kitchen: 0,
        },
        limits: {
          available_roles: ['manager', 'cashier', 'kitchen'],
          role_limits: {
            owner: 1,
            manager: 3,
            cashier: 3,
            kitchen: 3,
          },
        },
      },
      isLoading: false,
    })

    useCreateUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useUpdateUserRoleMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    useDeleteUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })

    vi.stubGlobal('window', { confirm: vi.fn(() => true) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submete edição de usuário com estado já preenchido', async () => {
    stateValues[1] = {
      id: 'user-2',
      full_name: 'Atendente',
      email: 'cashier@ops.test',
      role: 'cashier',
    }
    stateValues[8] = 'kitchen'

    const { toast } = await import('sonner')
    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')

    expect(renderToStaticMarkup(React.createElement(UsuariosPage))).toContain(
      'Users Page Content Mock'
    )

    const props = capturedUsersProps as {
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
    }
    const updateMutateAsync = useUpdateUserRoleMock.mock.results[0]?.value
      .mutateAsync as ReturnType<typeof vi.fn>

    await props.onSubmit({ preventDefault: vi.fn() })

    expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'user-2', role: 'kitchen' })
    expect(toast.success).toHaveBeenCalledWith('Perfil atualizado com sucesso.')
    expect(stateSetters[0]).toHaveBeenCalledWith(false)
    expect(stateSetters[1]).toHaveBeenCalledWith(null)
  })

  it('mostra fallback genérico ao falhar remover usuário', async () => {
    useDeleteUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockRejectedValue('falha inesperada'),
    })

    const { toast } = await import('sonner')
    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')

    renderToStaticMarkup(React.createElement(UsuariosPage))

    const props = capturedUsersProps as {
      onDeleteUser: (teamUser: Record<string, unknown>) => Promise<void>
    }

    await props.onDeleteUser({
      id: 'user-2',
      full_name: 'Atendente',
      email: 'cashier@ops.test',
    })

    expect(toast.error).toHaveBeenCalledWith('Erro ao remover usuário.')
  })

  it('usa fallback genérico ao falhar salvar e reseta a pagina nos filtros', async () => {
    useCreateUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockRejectedValue('falha inesperada'),
    })

    const { toast } = await import('sonner')
    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')

    renderToStaticMarkup(React.createElement(UsuariosPage))

    const props = capturedUsersProps as {
      onNameFilterChange: (value: string) => void
      onRoleFilterChange: (value: 'all' | 'owner' | 'manager' | 'cashier' | 'kitchen') => void
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
    }

    props.onNameFilterChange('chef')
    props.onRoleFilterChange('manager')
    await props.onSubmit({ preventDefault: vi.fn() })

    expect(stateSetters[4]).toHaveBeenCalledWith('chef')
    expect(stateSetters[3]).toHaveBeenCalledWith('manager')
    expect(stateSetters[2]).toHaveBeenCalledWith(1)
    expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar o usuário.')
  })

  it('usa email no confirm quando full_name não existe e mostra sucesso na remoção', async () => {
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined)
    useDeleteUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    })

    const confirmMock = vi.fn(() => true)
    vi.stubGlobal('window', { confirm: confirmMock })

    const { toast } = await import('sonner')
    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')

    renderToStaticMarkup(React.createElement(UsuariosPage))

    const props = capturedUsersProps as {
      onDeleteUser: (teamUser: Record<string, unknown>) => Promise<void>
    }

    await props.onDeleteUser({
      id: 'user-2',
      full_name: null,
      email: 'cashier@ops.test',
    })

    expect(confirmMock).toHaveBeenCalledWith(
      'Deseja remover o usuário "cashier@ops.test"? Esta ação não pode ser desfeita.'
    )
    expect(deleteMutateAsync).toHaveBeenCalledWith('user-2')
    expect(toast.success).toHaveBeenCalledWith('Usuário removido com sucesso.')
  })

  it('preenche valores padrão na criação e prepara edição com fallbacks', async () => {
    useUsersMock.mockReturnValue({
      data: {
        current_user_id: 'user-1',
        users: [],
        counts: {
          owner: 1,
          manager: 0,
          cashier: 0,
          kitchen: 0,
        },
        limits: {
          available_roles: [],
          role_limits: {
            owner: 1,
            manager: 3,
            cashier: 3,
            kitchen: 3,
          },
        },
      },
      isLoading: false,
    })

    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')

    renderToStaticMarkup(React.createElement(UsuariosPage))

    const props = capturedUsersProps as {
      onOpenCreate: () => void
      onOpenEdit: (teamUser: Record<string, unknown>) => void
    }

    props.onOpenCreate()
    props.onOpenEdit({
      id: 'user-2',
      full_name: null,
      email: 'cashier@ops.test',
      role: 'cashier',
    })

    expect(stateSetters[5]).toHaveBeenCalledWith('')
    expect(stateSetters[6]).toHaveBeenCalledWith('')
    expect(stateSetters[7]).toHaveBeenCalledWith('')
    expect(stateSetters[8]).toHaveBeenCalledWith('manager')
    expect(stateSetters[1]).toHaveBeenCalledWith(null)
    expect(stateSetters[0]).toHaveBeenCalledWith(true)

    expect(stateSetters[5]).toHaveBeenCalledWith('')
    expect(stateSetters[6]).toHaveBeenCalledWith('cashier@ops.test')
    expect(stateSetters[7]).toHaveBeenCalledWith('')
    expect(stateSetters[8]).toHaveBeenCalledWith('cashier')
    expect(stateSetters[1]).toHaveBeenCalledWith({
      id: 'user-2',
      full_name: null,
      email: 'cashier@ops.test',
      role: 'cashier',
    })
  })
})
