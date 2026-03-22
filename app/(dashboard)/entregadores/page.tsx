'use client'

import { useState } from 'react'
import {
  useCreateDeliveryDriver,
  useDeleteDeliveryDriver,
  useDeliveryDrivers,
  useUpdateDeliveryDriver,
  type DeliveryDriver,
} from '@/features/delivery/hooks/useDeliveryDrivers'
import { useUser } from '@/features/auth/hooks/useUser'
import { DeliveryDriversPageContent } from '@/features/delivery/DeliveryDriversPageContent'
import { toast } from 'sonner'

export default function EntregadoresPage() {
  const { user } = useUser()
  const { data: drivers, isLoading } = useDeliveryDrivers()
  const createDriver = useCreateDeliveryDriver()
  const updateDriver = useUpdateDeliveryDriver()
  const deleteDriver = useDeleteDeliveryDriver()

  const canManage = ['owner', 'manager'].includes(user?.profile.role ?? '')
  const [open, setOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleType, setVehicleType] = useState<DeliveryDriver['vehicle_type']>('moto')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  function resetForm() {
    setName('')
    setPhone('')
    setVehicleType('moto')
    setNotes('')
    setActive(true)
    setEditingDriver(null)
  }

  function openCreate() {
    resetForm()
    setOpen(true)
  }

  function openEdit(driver: DeliveryDriver) {
    setEditingDriver(driver)
    setName(driver.name)
    setPhone(driver.phone ?? '')
    setVehicleType(driver.vehicle_type)
    setNotes(driver.notes ?? '')
    setActive(driver.active)
    setOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      if (editingDriver) {
        await updateDriver.mutateAsync({
          id: editingDriver.id,
          name,
          phone,
          vehicle_type: vehicleType,
          active,
          notes,
        })
        toast.success('Entregador atualizado com sucesso.')
      } else {
        await createDriver.mutateAsync({
          name,
          phone,
          vehicle_type: vehicleType,
          active,
          notes,
        })
        toast.success('Entregador cadastrado com sucesso.')
      }

      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o entregador.')
    }
  }

  async function handleDelete(driver: DeliveryDriver) {
    if (!window.confirm(`Remover o entregador "${driver.name}"?`)) return

    try {
      await deleteDriver.mutateAsync(driver.id)
      toast.success('Entregador removido com sucesso.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover entregador.')
    }
  }

  const activeDrivers = drivers?.filter((driver) => driver.active).length ?? 0

  return (
    <DeliveryDriversPageContent
      canManage={canManage}
      activeDrivers={activeDrivers}
      isLoading={isLoading}
      drivers={drivers}
      openCreate={openCreate}
      openEdit={openEdit}
      onDelete={handleDelete}
      open={open}
      onOpenChange={setOpen}
      editingDriver={editingDriver}
      name={name}
      onNameChange={setName}
      phone={phone}
      onPhoneChange={setPhone}
      vehicleType={vehicleType}
      onVehicleTypeChange={setVehicleType}
      notes={notes}
      onNotesChange={setNotes}
      active={active}
      onActiveChange={setActive}
      onSubmit={handleSubmit}
      submitDisabled={createDriver.isPending || updateDriver.isPending}
    />
  )
}
