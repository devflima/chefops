import PaginationControls from '@/components/shared/PaginationControls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { TeamUser } from '@/features/users/hooks/useUsers'
import { formatRoleLabel, ROLE_LABELS, type EstablishmentRole } from '@/lib/rbac'
import { Pencil, Plus, Shield, Trash2, Users } from 'lucide-react'

const roleCardColors: Record<EstablishmentRole, string> = {
  owner: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-emerald-100 text-emerald-700',
  kitchen: 'bg-orange-100 text-orange-700',
}

type UsersRoleFilter = 'all' | EstablishmentRole

type UsersData = {
  current_user_id: string
  users: TeamUser[]
  counts: Record<EstablishmentRole, number>
  limits: {
    available_roles: EstablishmentRole[]
    role_limits: Record<EstablishmentRole, number>
  }
}

type Props = {
  isOwner: boolean
  isLoading: boolean
  data: UsersData | null
  nameFilter: string
  onNameFilterChange: (value: string) => void
  roleFilter: UsersRoleFilter
  onRoleFilterChange: (value: UsersRoleFilter) => void
  paginatedUsers: TeamUser[]
  canManageUser: (teamUser: TeamUser) => boolean
  onOpenCreate: () => void
  onOpenEdit: (teamUser: TeamUser) => void
  onDeleteUser: (teamUser: TeamUser) => void
  updatePending: boolean
  deletePending: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUser: TeamUser | null
  fullName: string
  onFullNameChange: (value: string) => void
  email: string
  onEmailChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  role: EstablishmentRole
  onRoleChange: (value: EstablishmentRole) => void
  availableRoles: EstablishmentRole[]
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  createPending: boolean
}

export function UsersPageContent({
  isOwner,
  isLoading,
  data,
  nameFilter,
  onNameFilterChange,
  roleFilter,
  onRoleFilterChange,
  paginatedUsers,
  canManageUser,
  onOpenCreate,
  onOpenEdit,
  onDeleteUser,
  updatePending,
  deletePending,
  page,
  totalPages,
  onPageChange,
  open,
  onOpenChange,
  editingUser,
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  role,
  onRoleChange,
  availableRoles,
  onSubmit,
  createPending,
}: Props) {
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
          <Button onClick={onOpenCreate}>
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
                  <span className="text-sm font-medium text-slate-400"> / {data.limits.role_limits[itemRole]}</span>
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
                  onChange={(event) => onNameFilterChange(event.target.value)}
                  className="max-w-sm bg-white"
                />
                <select
                  value={roleFilter}
                  onChange={(event) => onRoleFilterChange(event.target.value as UsersRoleFilter)}
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

            {paginatedUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhum usuário cadastrado.</p>
                {isOwner && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={onOpenCreate}>
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
                    const canManage = canManageUser(teamUser)

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
                              onClick={() => onOpenEdit(teamUser)}
                              disabled={!canManage || updatePending}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => onDeleteUser(teamUser)}
                              disabled={!canManage || deletePending}
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
          <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
              <Input
                value={fullName}
                onChange={(event) => onFullNameChange(event.target.value)}
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
                onChange={(event) => onEmailChange(event.target.value)}
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
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Min. 6 caracteres"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Perfil</label>
              <select
                value={role}
                onChange={(event) => onRoleChange(event.target.value as EstablishmentRole)}
                className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                {availableRoles.map((availableRole) => (
                  <option key={availableRole} value={availableRole}>
                    {ROLE_LABELS[availableRole]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPending || updatePending}>
                {editingUser
                  ? updatePending
                    ? 'Salvando...'
                    : 'Salvar alterações'
                  : createPending
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
