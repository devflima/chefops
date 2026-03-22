import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { DeliveryDriver } from '@/features/delivery/hooks/useDeliveryDrivers'
import { Bike, Pencil, Plus, Trash2 } from 'lucide-react'

const vehicleLabels: Record<DeliveryDriver['vehicle_type'], string> = {
  moto: 'Moto',
  bike: 'Bike',
  carro: 'Carro',
  outro: 'Outro',
}

type Props = {
  canManage: boolean
  activeDrivers: number
  isLoading: boolean
  drivers: DeliveryDriver[] | null | undefined
  openCreate: () => void
  openEdit: (driver: DeliveryDriver) => void
  onDelete: (driver: DeliveryDriver) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  editingDriver: DeliveryDriver | null
  name: string
  onNameChange: (value: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  vehicleType: DeliveryDriver['vehicle_type']
  onVehicleTypeChange: (value: DeliveryDriver['vehicle_type']) => void
  notes: string
  onNotesChange: (value: string) => void
  active: boolean
  onActiveChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  submitDisabled: boolean
}

export function DeliveryDriversPageContent({
  canManage,
  activeDrivers,
  isLoading,
  drivers,
  openCreate,
  openEdit,
  onDelete,
  open,
  onOpenChange,
  editingDriver,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  vehicleType,
  onVehicleTypeChange,
  notes,
  onNotesChange,
  active,
  onActiveChange,
  onSubmit,
  submitDisabled,
}: Props) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Entregadores</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeDrivers} ativo{activeDrivers !== 1 ? 's' : ''} na operação de delivery.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo entregador
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          O perfil atual pode acompanhar os entregadores, mas apenas owner e manager podem cadastrar ou editar.
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Carregando entregadores...</div>
      ) : !drivers || drivers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <Bike className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum entregador cadastrado.</p>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              Cadastrar primeiro entregador
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((driver) => (
            <div key={driver.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{driver.name}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        driver.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {driver.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{vehicleLabels[driver.vehicle_type]}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(driver)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => onDelete(driver)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  Telefone: <span className="font-medium">{driver.phone || 'Não informado'}</span>
                </p>
                {driver.notes && <p className="text-slate-500">Obs: {driver.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar entregador' : 'Novo entregador'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
              <Input value={name} onChange={(event) => onNameChange(event.target.value)} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
                <Input value={phone} onChange={(event) => onPhoneChange(event.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Veículo</label>
                <select
                  value={vehicleType}
                  onChange={(event) => onVehicleTypeChange(event.target.value as DeliveryDriver['vehicle_type'])}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="moto">Moto</option>
                  <option value="bike">Bike</option>
                  <option value="carro">Carro</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
              <textarea
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                placeholder="Opcional"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={active} onChange={(event) => onActiveChange(event.target.checked)} />
              Entregador ativo para novas entregas
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitDisabled}>
                {editingDriver ? 'Salvar alterações' : 'Cadastrar entregador'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
