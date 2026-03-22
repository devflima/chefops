import type { EstablishmentRole } from '@/lib/rbac'
import type { TeamUser } from '@/features/users/hooks/useUsers'

export type UsersRoleFilter = 'all' | EstablishmentRole

export type UserFormValues = {
  fullName: string
  email: string
  password: string
  role: EstablishmentRole
}

export function filterTeamUsers(users: TeamUser[], roleFilter: UsersRoleFilter, nameFilter: string) {
  const normalizedNameFilter = nameFilter.trim().toLowerCase()

  return users.filter((teamUser) => {
    if (roleFilter !== 'all' && teamUser.role !== roleFilter) return false
    if (normalizedNameFilter) {
      const target = `${teamUser.full_name ?? ''} ${teamUser.email}`.toLowerCase()
      if (!target.includes(normalizedNameFilter)) return false
    }
    return true
  })
}

export function paginateTeamUsers(users: TeamUser[], page: number, pageSize: number) {
  const safePage = Math.max(1, page)
  return users.slice((safePage - 1) * pageSize, safePage * pageSize)
}

export function getUsersTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function getDefaultUserFormValues(role: EstablishmentRole = 'manager'): UserFormValues {
  return {
    fullName: '',
    email: '',
    password: '',
    role,
  }
}

export function getEditUserFormValues(teamUser: TeamUser): UserFormValues {
  return {
    fullName: teamUser.full_name ?? '',
    email: teamUser.email,
    password: '',
    role: teamUser.role,
  }
}

export function canManageTeamUser(isOwner: boolean, currentUserId: string, teamUserId: string) {
  return isOwner && currentUserId !== teamUserId
}
