'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Resolver } from 'react-hook-form'
import { useCanAddMore, usePlan } from '@/features/plans/hooks/usePlan'
import { ExtrasPageContent } from '@/features/products/ExtrasPageContent'
import {
  filterExtras,
  getDefaultExtraFormValues,
  getExtraFormValues,
  getExtrasPlanUsageText,
  getExtrasTotalPages,
  isExtrasLimitReached,
  paginateExtras,
  type Extra,
  type ExtraCategoryFilter,
} from '@/features/products/extras-page'

type CategoryOption = {
  id: string
  name: string
}

const extraSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  price: z.coerce.number().min(0),
  category: z.enum(['border', 'flavor', 'other']),
  target_categories: z.array(z.string()),
})

type ExtraForm = z.infer<typeof extraSchema>

export default function ExtrasPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Extra | null>(null)
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<ExtraCategoryFilter>('all')
  const [nameFilter, setNameFilter] = useState('')
  const pageSize = 10
  const queryClient = useQueryClient()
  const { data: plan } = usePlan()

  const { data: extras, isLoading } = useQuery({
    queryKey: ['extras'],
    queryFn: async () => {
      const res = await fetch('/api/extras')
      const json = await res.json()
      return json.data as Extra[]
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      const json = await res.json()
      return (json.data ?? []) as CategoryOption[]
    },
  })

  const form = useForm<ExtraForm, unknown, ExtraForm>({
    resolver: zodResolver(extraSchema) as Resolver<ExtraForm>,
    defaultValues: getDefaultExtraFormValues(),
  })
  const filteredExtras = filterExtras(extras ?? [], categoryFilter, nameFilter)
  const paginatedExtras = paginateExtras(filteredExtras, page, pageSize)
  const extrasCount = extras?.length ?? 0
  const canAddMoreExtras = useCanAddMore('extras', extrasCount)
  const extrasLimitReached = isExtrasLimitReached(plan, canAddMoreExtras)

  function openCreate() {
    setEditing(null)
    form.reset(getDefaultExtraFormValues())
    setOpen(true)
  }

  function openEdit(extra: Extra) {
    setEditing(extra)
    form.reset(getExtraFormValues(extra))
    setOpen(true)
  }

  async function onSubmit(values: ExtraForm) {
    const payload = values

    try {
      if (editing) {
        const res = await fetch(`/api/extras/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch('/api/extras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
      }
      queryClient.invalidateQueries({ queryKey: ['extras'] })
      setOpen(false)
      form.reset()
    } catch {
      form.setError('root', { message: 'Erro ao salvar adicional.' })
    }
  }

  async function handleDelete(extra: Extra) {
    if (!confirm(`Deseja desativar "${extra.name}"?`)) return
    await fetch(`/api/extras/${extra.id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['extras'] })
  }

  return (
    <ExtrasPageContent
      planUsageText={getExtrasPlanUsageText(plan, extrasCount)}
      extrasLimitReached={extrasLimitReached}
      extrasLimit={plan?.resource_limits?.extras}
      openCreate={openCreate}
      nameFilter={nameFilter}
      onNameFilterChange={(value) => {
        setNameFilter(value)
        setPage(1)
      }}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={(value) => {
        setCategoryFilter(value)
        setPage(1)
      }}
      isLoading={isLoading}
      filteredExtras={filteredExtras}
      paginatedExtras={paginatedExtras}
      openEdit={openEdit}
      onDelete={handleDelete}
      page={page}
      totalPages={getExtrasTotalPages(filteredExtras.length, pageSize)}
      onPageChange={setPage}
      open={open}
      onOpenChange={setOpen}
      editing={editing}
      categories={categories}
      form={form}
      onSubmit={onSubmit}
    />
  )
}
