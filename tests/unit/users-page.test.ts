import { describe, expect, it } from 'vitest'

import {
  canManageTeamUser,
  filterTeamUsers,
  getDefaultUserFormValues,
  getEditUserFormValues,
  getUsersTotalPages,
  paginateTeamUsers,
} from '@/features/users/users-page'

const users = [
  {
    id: '1',
    full_name: 'Maria Silva',
    email: 'maria@test.com',
    role: 'owner' as const,
    created_at: '2026-03-21T00:00:00.000Z',
  },
  {
    id: '2',
    full_name: 'Carlos Souza',
    email: 'carlos@test.com',
    role: 'manager' as const,
    created_at: '2026-03-21T00:00:00.000Z',
  },
  {
    id: '3',
    full_name: null,
    email: 'caixa@test.com',
    role: 'cashier' as const,
    created_at: '2026-03-21T00:00:00.000Z',
  },
]

describe('users page helpers', () => {
  it('filtra usuarios por papel e nome/email', () => {
    expect(filterTeamUsers(users, 'all', '')).toHaveLength(3)
    expect(filterTeamUsers(users, 'manager', '')).toEqual([users[1]])
    expect(filterTeamUsers(users, 'all', 'maria')).toEqual([users[0]])
    expect(filterTeamUsers(users, 'all', 'caixa@')).toEqual([users[2]])
  })

  it('pagina usuarios e calcula total de paginas', () => {
    expect(paginateTeamUsers(users, 1, 2)).toEqual([users[0], users[1]])
    expect(paginateTeamUsers(users, 2, 2)).toEqual([users[2]])
    expect(getUsersTotalPages(0, 10)).toBe(1)
    expect(getUsersTotalPages(21, 10)).toBe(3)
  })

  it('retorna valores default e de edicao do formulario', () => {
    expect(getDefaultUserFormValues()).toEqual({
      fullName: '',
      email: '',
      password: '',
      role: 'manager',
    })

    expect(getDefaultUserFormValues('kitchen')).toEqual({
      fullName: '',
      email: '',
      password: '',
      role: 'kitchen',
    })

    expect(getEditUserFormValues(users[1])).toEqual({
      fullName: 'Carlos Souza',
      email: 'carlos@test.com',
      password: '',
      role: 'manager',
    })
  })

  it('calcula permissao de gerenciamento por usuario', () => {
    expect(canManageTeamUser(true, '1', '2')).toBe(true)
    expect(canManageTeamUser(true, '1', '1')).toBe(false)
    expect(canManageTeamUser(false, '1', '2')).toBe(false)
  })
})
