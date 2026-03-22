import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useCategoriesMock = vi.fn()
const usePlanMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const useQueryMock = vi.fn()
const useUserMock = vi.fn()
const useUsersMock = vi.fn()
const useCreateUserMock = vi.fn()
const useUpdateUserRoleMock = vi.fn()
const useDeleteUserMock = vi.fn()
const invalidateQueriesMock = vi.fn()

let currentUseFormValue: Record<string, unknown>
let capturedCategoriesProps: Record<string, unknown> | null = null
let capturedExtrasProps: Record<string, unknown> | null = null
let capturedUsersProps: Record<string, unknown> | null = null

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
  useQuery: (...args: Parameters<typeof useQueryMock>) => useQueryMock(...args),
}))

vi.mock('react-hook-form', () => ({
  useForm: () => currentUseFormValue,
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

vi.mock('@/features/products/hooks/useProducts', () => ({
  useCategories: () => useCategoriesMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
  useCanAddMore: (...args: Parameters<typeof useCanAddMoreMock>) => useCanAddMoreMock(...args),
}))

vi.mock('@/features/products/CategoriesPageContent', () => ({
  CategoriesPageContent: (props: Record<string, unknown>) => {
    capturedCategoriesProps = props
    return React.createElement('div', null, 'Categories Page Content Mock')
  },
}))

vi.mock('@/features/products/ExtrasPageContent', () => ({
  ExtrasPageContent: (props: Record<string, unknown>) => {
    capturedExtrasProps = props
    return React.createElement('div', null, 'Extras Page Content Mock')
  },
}))

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('catalog and users page components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCategoriesProps = null
    capturedExtrasProps = null
    capturedUsersProps = null
    currentUseFormValue = {
      control: {},
      reset: vi.fn(),
      setError: vi.fn(),
      handleSubmit: vi.fn((callback: (values: unknown) => unknown) => callback),
      formState: {
        isSubmitting: false,
        errors: {},
      },
    }

    usePlanMock.mockReturnValue({
      data: {
        resource_limits: {
          categories: 20,
          extras: 20,
        },
      },
    })
    useCanAddMoreMock.mockReturnValue(true)
    invalidateQueriesMock.mockResolvedValue(undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      })
    )
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('window', { confirm: vi.fn(() => true) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encaminha ações principais da página de categorias', async () => {
    useCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'cat-1',
          name: 'Pizzas',
          display_order: 1,
          goes_to_kitchen: true,
        },
      ],
      isLoading: false,
    })

    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')

    expect(renderToStaticMarkup(React.createElement(CategoriasPage))).toContain(
      'Categories Page Content Mock'
    )
    expect(capturedCategoriesProps).toBeTruthy()

    const props = capturedCategoriesProps as {
      categoryLimitReached: boolean
      onNameFilterChange: (value: string) => void
      onDestinationFilterChange: (value: 'all' | 'kitchen' | 'counter') => void
      onPageChange: (page: number) => void
      openCreate: () => void
      openEdit: (category: Record<string, unknown>) => void
      onDelete: (category: Record<string, unknown>) => Promise<void>
      onOpenChange: (open: boolean) => void
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    expect(props.categoryLimitReached).toBe(false)

    const formReset = currentUseFormValue.reset as ReturnType<typeof vi.fn>
    const formSetError = currentUseFormValue.setError as ReturnType<typeof vi.fn>

    props.onNameFilterChange('pizza')
    props.onDestinationFilterChange('counter')
    props.onPageChange(2)
    props.openCreate()
    props.openEdit({
      id: 'cat-1',
      name: 'Pizzas',
      display_order: 1,
      goes_to_kitchen: true,
    })
    await props.onDelete({
      id: 'cat-1',
      name: 'Pizzas',
    })
    props.onOpenChange(false)
    await props.onSubmit({
      name: 'Bebidas',
      display_order: 2,
      goes_to_kitchen: false,
    })

    expect(formReset).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith('/api/categories?id=cat-1', { method: 'DELETE' })
    expect(fetch).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bebidas',
        display_order: 2,
        goes_to_kitchen: false,
      }),
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['categories'] })
    expect(formSetError).not.toHaveBeenCalled()
  })

  it('cobre cancelamento, limite do plano e erro de submit/delete na página de categorias', async () => {
    useCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'cat-1',
          name: 'Pizzas',
          display_order: 1,
          goes_to_kitchen: true,
        },
      ],
      isLoading: false,
    })
    useCanAddMoreMock.mockReturnValue(false)

    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Falha ao salvar categoria' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => false))

    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')

    renderToStaticMarkup(React.createElement(CategoriasPage))

    const props = capturedCategoriesProps as {
      categoryLimitReached: boolean
      onDelete: (category: Record<string, unknown>) => Promise<void>
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }
    const formSetError = currentUseFormValue.setError as ReturnType<typeof vi.fn>

    expect(props.categoryLimitReached).toBe(true)

    await props.onDelete({
      id: 'cat-1',
      name: 'Pizzas',
    })

    expect(fetchMock).not.toHaveBeenCalledWith('/api/categories?id=cat-1', { method: 'DELETE' })

    vi.stubGlobal('confirm', vi.fn(() => true))

    await props.onSubmit({
      name: 'Doces',
      display_order: 5,
      goes_to_kitchen: false,
    })

    await props.onDelete({
      id: 'cat-1',
      name: 'Pizzas',
    })

    expect(formSetError).toHaveBeenCalledWith('root', {
      message: 'Falha ao salvar categoria',
    })
    expect(alert).toHaveBeenCalledWith('Erro ao excluir categoria.')
  })


  it('encaminha ações principais da página de extras', async () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 'extra-1',
          name: 'Borda',
          category: 'border',
          price: 10,
        },
      ],
      isLoading: false,
    })

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')

    expect(renderToStaticMarkup(React.createElement(ExtrasPage))).toContain(
      'Extras Page Content Mock'
    )
    expect(capturedExtrasProps).toBeTruthy()

    const props = capturedExtrasProps as {
      extrasLimitReached: boolean
      onNameFilterChange: (value: string) => void
      onCategoryFilterChange: (value: 'all' | 'border' | 'flavor' | 'other') => void
      onPageChange: (page: number) => void
      openCreate: () => void
      openEdit: (extra: Record<string, unknown>) => void
      onDelete: (extra: Record<string, unknown>) => Promise<void>
      onOpenChange: (open: boolean) => void
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    expect(props.extrasLimitReached).toBe(false)

    const formReset = currentUseFormValue.reset as ReturnType<typeof vi.fn>

    props.onNameFilterChange('borda')
    props.onCategoryFilterChange('flavor')
    props.onPageChange(2)
    props.openCreate()
    props.openEdit({
      id: 'extra-1',
      name: 'Borda',
      category: 'border',
      price: 10,
    })
    await props.onDelete({
      id: 'extra-1',
      name: 'Borda',
    })
    props.onOpenChange(false)
    await props.onSubmit({
      name: 'Cheddar',
      category: 'other',
      price: 4.5,
    })

    expect(formReset).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith('/api/extras/extra-1', { method: 'DELETE' })
    expect(fetch).toHaveBeenCalledWith('/api/extras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cheddar',
        category: 'other',
        price: 4.5,
      }),
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['extras'] })
  })

  it('cobre limite, cancelamento e erro de submit na página de extras', async () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 'extra-1',
          name: 'Borda',
          category: 'border',
          price: 10,
        },
      ],
      isLoading: false,
    })
    useCanAddMoreMock.mockReturnValue(false)

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => false))

    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')
    renderToStaticMarkup(React.createElement(ExtrasPage))

    const props = capturedExtrasProps as {
      extrasLimitReached: boolean
      onDelete: (extra: Record<string, unknown>) => Promise<void>
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }
    const formSetError = currentUseFormValue.setError as ReturnType<typeof vi.fn>

    expect(props.extrasLimitReached).toBe(true)

    await props.onDelete({
      id: 'extra-1',
      name: 'Borda',
    })

    expect(fetchMock).not.toHaveBeenCalledWith('/api/extras/extra-1', { method: 'DELETE' })

    await props.onSubmit({
      name: 'Falhou',
      category: 'other',
      price: 3,
    })

    vi.stubGlobal('confirm', vi.fn(() => true))
    await props.onDelete({
      id: 'extra-1',
      name: 'Borda',
    })

    expect(formSetError).toHaveBeenCalledWith('root', {
      message: 'Erro ao salvar adicional.',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/extras/extra-1', { method: 'DELETE' })
  })


  it('encaminha ações principais da página de usuários', async () => {
    const createMutateAsync = vi.fn().mockResolvedValue(undefined)
    const updateMutateAsync = vi.fn().mockResolvedValue(undefined)
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined)

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
      mutateAsync: createMutateAsync,
    })
    useUpdateUserRoleMock.mockReturnValue({
      isPending: false,
      mutateAsync: updateMutateAsync,
    })
    useDeleteUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    })

    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')

    expect(renderToStaticMarkup(React.createElement(UsuariosPage))).toContain(
      'Users Page Content Mock'
    )
    expect(capturedUsersProps).toBeTruthy()

    const props = capturedUsersProps as {
      isOwner: boolean
      onNameFilterChange: (value: string) => void
      onRoleFilterChange: (value: 'all' | 'owner' | 'manager' | 'cashier' | 'kitchen') => void
      onPageChange: (page: number) => void
      onOpenCreate: () => void
      onOpenEdit: (teamUser: Record<string, unknown>) => void
      onDeleteUser: (teamUser: Record<string, unknown>) => Promise<void>
      canManageUser: (teamUser: Record<string, unknown>) => boolean
      onOpenChange: (open: boolean) => void
      onFullNameChange: (value: string) => void
      onEmailChange: (value: string) => void
      onPasswordChange: (value: string) => void
      onRoleChange: (value: 'owner' | 'manager' | 'cashier' | 'kitchen') => void
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
    }

    expect(props.isOwner).toBe(true)
    expect(props.canManageUser({ id: 'user-2' })).toBe(true)

    props.onNameFilterChange('aten')
    props.onRoleFilterChange('cashier')
    props.onPageChange(2)
    props.onOpenCreate()
    props.onOpenEdit({
      id: 'user-2',
      full_name: 'Atendente',
      email: 'cashier@ops.test',
      role: 'cashier',
    })
    await props.onDeleteUser({
      id: 'user-2',
      full_name: 'Atendente',
      email: 'cashier@ops.test',
    })
    props.onOpenChange(false)
    props.onFullNameChange('Novo Nome')
    props.onEmailChange('novo@ops.test')
    props.onPasswordChange('123456')
    props.onRoleChange('manager')
    await props.onSubmit({
      preventDefault: vi.fn(),
    })

    expect(deleteMutateAsync).toHaveBeenCalledWith('user-2')
    expect(createMutateAsync).toHaveBeenCalled()
  })

  it('cobre falta de permissão, cancelamento e erros da página de usuários', async () => {
    const createMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao criar usuário'))
    const updateMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao atualizar usuário'))
    const deleteMutateAsync = vi.fn().mockRejectedValue(new Error('Falha ao remover usuário'))

    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'cashier',
        },
      },
    })
    useUsersMock.mockReturnValue({
      data: {
        current_user_id: 'user-1',
        users: [
          {
            id: 'user-2',
            full_name: 'Maria',
            email: 'maria@ops.test',
            role: 'manager',
            created_at: '2026-03-20T00:00:00.000Z',
          },
        ],
        counts: {
          owner: 0,
          manager: 1,
          cashier: 0,
          kitchen: 0,
        },
        limits: {
          available_roles: ['manager', 'cashier'],
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
      mutateAsync: createMutateAsync,
    })
    useUpdateUserRoleMock.mockReturnValue({
      isPending: false,
      mutateAsync: updateMutateAsync,
    })
    useDeleteUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    })
    ;(window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { toast } = await import('sonner')
    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')
    renderToStaticMarkup(React.createElement(UsuariosPage))

    const props = capturedUsersProps as {
      isOwner: boolean
      canManageUser: (teamUser: Record<string, unknown>) => boolean
      onDeleteUser: (teamUser: Record<string, unknown>) => Promise<void>
      onOpenEdit: (teamUser: Record<string, unknown>) => void
      onOpenCreate: () => void
      onRoleChange: (value: 'owner' | 'manager' | 'cashier' | 'kitchen') => void
      onSubmit: (event: { preventDefault: () => void }) => Promise<void>
    }

    expect(props.isOwner).toBe(false)
    expect(props.canManageUser({ id: 'user-2' })).toBe(false)

    await props.onDeleteUser({
      id: 'user-2',
      full_name: 'Maria',
      email: 'maria@ops.test',
    })
    expect(deleteMutateAsync).not.toHaveBeenCalled()

    props.onOpenCreate()
    props.onRoleChange('cashier')
    await props.onSubmit({
      preventDefault: vi.fn(),
    })

    expect(createMutateAsync).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Falha ao criar usuário')

    ;(window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true)
    await props.onDeleteUser({
      id: 'user-2',
      full_name: 'Maria',
      email: 'maria@ops.test',
    })

    expect(deleteMutateAsync).toHaveBeenCalledWith('user-2')
    expect(toast.error).toHaveBeenCalledWith('Falha ao remover usuário')
  })
})
