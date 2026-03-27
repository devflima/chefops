import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useHasFeatureMock = vi.fn()
const useUserMock = vi.fn()
const useUsersMock = vi.fn()
const useCreateUserMock = vi.fn()
const useUpdateUserRoleMock = vi.fn()
const useDeleteUserMock = vi.fn()

vi.mock('@/features/plans/hooks/usePlan', async () => {
  const actual = await vi.importActual<typeof import('@/features/plans/hooks/usePlan')>(
    '@/features/plans/hooks/usePlan'
  )

  return {
    ...actual,
    useHasFeature: (...args: Parameters<typeof useHasFeatureMock>) => useHasFeatureMock(...args),
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
  UsersPageContent: () => React.createElement('div', null, 'Users Page Content Mock'),
}))

describe('Usuarios page plan gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUserMock.mockReturnValue({ user: { profile: { role: 'owner' } } })
    useUsersMock.mockReturnValue({ data: null, isLoading: false })
    useCreateUserMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUpdateUserRoleMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useDeleteUserMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
  })

  it('mostra bloqueio quando o plano não inclui equipe', async () => {
    useHasFeatureMock.mockReturnValue(false)

    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')
    const markup = renderToStaticMarkup(React.createElement(UsuariosPage))

    expect(markup).toContain('Recurso não disponível')
    expect(markup).toContain('Ver planos disponíveis')
    expect(markup).not.toContain('Users Page Content Mock')
  })
})
