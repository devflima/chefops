'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PaginationControls from '@/components/shared/PaginationControls'
import { useUser } from '@/features/auth/hooks/useUser'
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
  type TeamUser,
} from '@/features/users/hooks/useUsers'
import {
  type EstablishmentRole,
  formatRoleLabel,
  ROLE_LABELS,
} from '@/lib/rbac'
import { Pencil, Plus, Shield, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

const roleCardColors: Record<EstablishmentRole, string> = {
  owner: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-emerald-100 text-emerald-700',
  kitchen: 'bg-orange-100 text-orange-700',
}

export default function UsuariosPage() {
  const { user } = useUser()
  const { data, isLoading } = useUsers()
  const createUser = useCreateUser()
  const updateUserRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()

  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<'all' | EstablishmentRole>('all')
  const [nameFilter, setNameFilter] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<EstablishmentRole>('manager')

  const isOwner = user?.profile.role === 'owner'
  const availableRoles = data?.limits.available_roles ?? []
  const pageSize = 10
  const filteredUsers = (data?.users ?? []).filter((teamUser) => {
    if (roleFilter !== 'all' && teamUser.role !== roleFilter) return false
    if (nameFilter) {
      const target = `${teamUser.full_name ?? ''} ${teamUser.email}`.toLowerCase()
      if (!target.includes(nameFilter.toLowerCase())) return false
    }
    return true
  })
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)

  function openCreate() {
    setFullName('')
    setEmail('')
    setPassword('')
    setRole(availableRoles[0] ?? 'manager')
    setEditingUser(null)
    setOpen(true)
  }

  function openEdit(teamUser: TeamUser) {
    setFullName(teamUser.full_name ?? '')
    setEmail(teamUser.email)
    setPassword('')
    setRole(teamUser.role)
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Equipe e acessos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize a equipe do estabelecimento com perfis por função.
          </p>
        </div>
        {isOwner && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo usuário
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Carregando equipe...</div>
      ) : !data ? (
        <div className="py-12 text-center text-slate-400">Não foi possível carregar a equipe.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(['owner', 'manager', 'cashier', 'kitchen'] as EstablishmentRole[]).map((itemRole) => (
              <div key={itemRole} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleCardColors[itemRole]}`}>
                    {ROLE_LABELS[itemRole]}
                  </span>
                  <Shield className="h-4 w-4 text-slate-300" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {data.counts[itemRole]}
                  <span className="text-sm font-medium text-slate-400">
                    {' '} / {data.limits.role_limits[itemRole]}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Usuários neste perfil</p>
              </div>
            ))}
          </div>

          {!isOwner && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Apenas o perfil owner pode criar, editar ou remover acessos da equipe.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-medium text-slate-900">Usuários do estabelecimento</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Filtrar por nome ou e-mail..."
                  value={nameFilter}
                  onChange={(event) => {
                    setNameFilter(event.target.value)
                    setPage(1)
                  }}
                  className="max-w-sm bg-white"
                />
                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value as typeof roleFilter)
                    setPage(1)
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="all">Todos os perfis</option>
                  {(['owner', 'manager', 'cashier', 'kitchen'] as EstablishmentRole[]).map((itemRole) => (
                    <option key={itemRole} value={itemRole}>
                      {ROLE_LABELS[itemRole]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhum usuário cadastrado.</p>
                {isOwner && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                    Criar primeiro usuário
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {['Usuário', 'Perfil', 'Criado em', ''].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((teamUser) => {
                    const isCurrentUser = teamUser.id === data.current_user_id
                    const canManage = isOwner && !isCurrentUser

                    return (
                      <tr key={teamUser.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                              {(teamUser.full_name ?? teamUser.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium text-slate-900">
                                  {teamUser.full_name ?? 'Sem nome'}
                                </p>
                                {isCurrentUser && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    Você
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-sm text-slate-500">{teamUser.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleCardColors[teamUser.role]}`}>
                            {formatRoleLabel(teamUser.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(teamUser.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(teamUser)}
                              disabled={!canManage || updateUserRole.isPending}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleDeleteUser(teamUser)}
                              disabled={!canManage || deleteUser.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <PaginationControls
            page={page}
            totalPages={Math.max(1, Math.ceil(filteredUsers.length / pageSize))}
            onPageChange={setPage}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nome completo"
                disabled={!!editingUser}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@empresa.com"
                disabled={!!editingUser}
                required
              />
            </div>

            {!editingUser && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Senha inicial</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Min. 6 caracteres"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Perfil</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as EstablishmentRole)}
                className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                {(editingUser ? availableRoles : availableRoles).map((availableRole) => (
                  <option key={availableRole} value={availableRole}>
                    {ROLE_LABELS[availableRole]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending || updateUserRole.isPending}
              >
                {editingUser
                  ? updateUserRole.isPending
                    ? 'Salvando...'
                    : 'Salvar alterações'
                  : createUser.isPending
                    ? 'Criando...'
                    : 'Criar usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
