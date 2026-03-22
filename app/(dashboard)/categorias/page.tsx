'use client'

import { useState } from 'react'
import { useCategories } from '@/features/products/hooks/useProducts'
import { useQueryClient } from '@tanstack/react-query'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Category } from '@/features/products/types'
import { useCanAddMore, usePlan } from '@/features/plans/hooks/usePlan'
import { CategoriesPageContent } from '@/features/products/CategoriesPageContent'
import {
  filterCategories,
  getCategoryFormValues,
  getCategoryPlanUsageText,
  getCategoryTotalPages,
  getDefaultCategoryFormValues,
  isCategoryLimitReached,
  paginateCategories,
  type CategoryDestinationFilter,
} from '@/features/products/category-page'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  display_order: z.coerce.number().int().default(0),
  goes_to_kitchen: z.boolean().default(true),
})

type CategoryForm = z.infer<typeof categorySchema>

export default function CategoriasPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [destinationFilter, setDestinationFilter] = useState<CategoryDestinationFilter>('all')
  const [nameFilter, setNameFilter] = useState('')
  const pageSize = 10

  const { data: categories, isLoading } = useCategories()
  const { data: plan } = usePlan()
  const filteredCategories = filterCategories(categories ?? [], destinationFilter, nameFilter)
  const paginatedCategories = paginateCategories(filteredCategories, page, pageSize)
  const categoryCount = categories?.length ?? 0
  const canAddMoreCategories = useCanAddMore('categories', categoryCount)
  const categoryLimitReached = isCategoryLimitReached(plan, canAddMoreCategories)
  const queryClient = useQueryClient()

  const form = useForm<CategoryForm, unknown, CategoryForm>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryForm>,
    defaultValues: getDefaultCategoryFormValues(),
  })

  function openCreate() {
    setEditing(null)
    form.reset(getDefaultCategoryFormValues())
    setOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset(getCategoryFormValues(cat))
    setOpen(true)
  }

  async function onSubmit(values: CategoryForm) {
    try {
      if (editing) {
        const res = await fetch('/api/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...values }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      form.reset()
    } catch (e: unknown) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'Erro ao salvar categoria.',
      })
    }
  }

  async function handleDelete(cat: Category) {
    if (
      !confirm(
        `Deseja excluir a categoria "${cat.name}"?\nProdutos vinculados ficarão sem categoria.`
      )
    )
      return
    setDeletingId(cat.id)
    try {
      const res = await fetch(`/api/categories?id=${cat.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    } catch {
      alert('Erro ao excluir categoria.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <CategoriesPageContent
      planUsageText={getCategoryPlanUsageText(plan, categoryCount)}
      categoryLimitReached={categoryLimitReached}
      categoryLimit={plan?.resource_limits?.categories}
      openCreate={openCreate}
      nameFilter={nameFilter}
      onNameFilterChange={(value) => {
        setNameFilter(value)
        setPage(1)
      }}
      destinationFilter={destinationFilter}
      onDestinationFilterChange={(value) => {
        setDestinationFilter(value)
        setPage(1)
      }}
      isLoading={isLoading}
      filteredCategories={filteredCategories}
      paginatedCategories={paginatedCategories}
      openEdit={openEdit}
      deletingId={deletingId}
      onDelete={handleDelete}
      page={page}
      totalPages={getCategoryTotalPages(filteredCategories.length, pageSize)}
      onPageChange={setPage}
      open={open}
      onOpenChange={setOpen}
      editing={editing}
      form={form}
      onSubmit={onSubmit}
    />
  )
}
