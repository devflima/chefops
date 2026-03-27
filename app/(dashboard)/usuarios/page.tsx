'use client'

import { useState } from 'react'
import { useUser } from '@/features/auth/hooks/useUser'
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
  type TeamUser,
} from '@/features/users/hooks/useUsers'
import { UsersPageContent } from '@/features/users/UsersPageContent'
import { type EstablishmentRole } from '@/lib/rbac'
import { toast } from 'sonner'
import {
  canManageTeamUser,
  filterTeamUsers,
  getDefaultUserFormValues,
  getEditUserFormValues,
  getUsersTotalPages,
  paginateTeamUsers,
  type UsersRoleFilter,
} from '@/features/users/users-page'
import FeatureGate from '@/features/plans/components/FeatureGate'

export default function UsuariosPage() {
  const { user } = useUser()
  const { data, isLoading } = useUsers()
  const createUser = useCreateUser()
  const updateUserRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()

  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<UsersRoleFilter>('all')
  const [nameFilter, setNameFilter] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<EstablishmentRole>('manager')

  const isOwner = user?.profile.role === 'owner'
  const availableRoles = data?.limits.available_roles ?? []
  const pageSize = 10
  const filteredUsers = filterTeamUsers(data?.users ?? [], roleFilter, nameFilter)
  const paginatedUsers = paginateTeamUsers(filteredUsers, page, pageSize)

  function openCreate() {
    const defaultValues = getDefaultUserFormValues(availableRoles[0] ?? 'manager')
    setFullName(defaultValues.fullName)
    setEmail(defaultValues.email)
    setPassword(defaultValues.password)
    setRole(defaultValues.role)
    setEditingUser(null)
    setOpen(true)
  }

  function openEdit(teamUser: TeamUser) {
    const editValues = getEditUserFormValues(teamUser)
    setFullName(editValues.fullName)
    setEmail(editValues.email)
    setPassword(editValues.password)
    setRole(editValues.role)
    setEditingUser(teamUser)
    setOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      if (editingUser) {
        await updateUserRole.mutateAsync({ id: editingUser.id, role })
        toast.success('Perfil atualizado com sucesso.')
      } else {
        await createUser.mutateAsync({
          full_name: fullName,
          email,
          password,
          role,
        })
        toast.success('Usuário criado com sucesso.')
      }

      setOpen(false)
      setEditingUser(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível salvar o usuário.'
      )
    }
  }

  async function handleDeleteUser(teamUser: TeamUser) {
    if (
      !window.confirm(
        `Deseja remover o usuário "${teamUser.full_name ?? teamUser.email}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return
    }

    try {
      await deleteUser.mutateAsync(teamUser.id)
      toast.success('Usuário removido com sucesso.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover usuário.')
    }
  }

  return (
    <FeatureGate feature="team">
      <UsersPageContent
        isOwner={!!isOwner}
        isLoading={isLoading}
        data={data ?? null}
        nameFilter={nameFilter}
        onNameFilterChange={(value) => {
          setNameFilter(value)
          setPage(1)
        }}
        roleFilter={roleFilter}
        onRoleFilterChange={(value) => {
          setRoleFilter(value)
          setPage(1)
        }}
        paginatedUsers={paginatedUsers}
        canManageUser={(teamUser) =>
          canManageTeamUser(!!isOwner, data?.current_user_id ?? '', teamUser.id)
        }
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
        onDeleteUser={handleDeleteUser}
        updatePending={updateUserRole.isPending}
        deletePending={deleteUser.isPending}
        page={page}
        totalPages={getUsersTotalPages(filteredUsers.length, pageSize)}
        onPageChange={setPage}
        open={open}
        onOpenChange={setOpen}
        editingUser={editingUser}
        fullName={fullName}
        onFullNameChange={setFullName}
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        role={role}
        onRoleChange={setRole}
        availableRoles={availableRoles}
        onSubmit={handleSubmit}
        createPending={createUser.isPending}
      />
    </FeatureGate>
  )
}
