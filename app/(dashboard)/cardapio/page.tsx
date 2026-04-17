'use client'

import { useState } from 'react'
import { useMenuItems, useCreateMenuItem } from '@/features/orders/hooks/useOrders'
import { useCategories, useProducts } from '@/features/products/hooks/useProducts'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCanAddMore, useHasFeature, usePlan } from '@/features/plans/hooks/usePlan'
import type { MenuItem } from '@/features/orders/types'
import type { Resolver } from 'react-hook-form'
import {
  addMenuIngredient,
  buildMenuAvailabilityState,
  buildMenuAvailabilityRequest,
  buildCreateMenuItemPayload,
  buildMenuPageSummary,
  buildUpdateMenuItemPayload,
  filterMenuItems,
  getCreateMenuEditorState,
  getMenuEditState,
  getMenuFilterChangeState,
  getMenuSubmitErrorMessage,
  getInitialMenuItemFormValues,
  getMenuSubmitSuccessState,
  getMenuTotalPages,
  getNormalizedIngredients,
  paginateMenuItems,
  removeMenuIngredient,
  updateMenuIngredient,
} from '@/features/menu/dashboard-menu-page'
import { MenuDashboardPageContent } from '@/features/menu/MenuDashboardPageContent'

const menuItemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço obrigatório'),
  category_id: z.string().optional(),
  display_order: z.coerce.number().int().default(0),
})

type MenuItemForm = z.infer<typeof menuItemSchema>

type MenuItemIngredient = {
  product_id: string
  quantity: number
}

export default function CardapioPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'inactive'>('available')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const pageSize = 10

  const { data: allItems, isLoading } = useMenuItems()
  const { data: categories } = useCategories()
  const { data: products } = useProducts({ active: true, page: 1, pageSize: 100 })
  const createMenuItem = useCreateMenuItem()
  const queryClient = useQueryClient()
  const hasStockAutomation = useHasFeature('stock_automation')
  const { data: plan } = usePlan()

  const items = filterMenuItems(allItems ?? [], statusFilter, categoryFilter)
  const paginatedItems = paginateMenuItems(items, page, pageSize)
  const { availableCount, inactiveCount, menuItemCount, limitLabel } = buildMenuPageSummary(
    allItems,
    plan,
  )
  const canAddMoreMenuItems = useCanAddMore('menu_items', menuItemCount)
  const menuItemLimitReached = !!plan && !canAddMoreMenuItems

  const form = useForm<MenuItemForm, unknown, MenuItemForm>({
    resolver: zodResolver(menuItemSchema) as Resolver<MenuItemForm>,
    defaultValues: getInitialMenuItemFormValues(),
  })

  const { data: allExtras } = useQuery({
    queryKey: ['extras'],
    queryFn: async () => {
      const res = await fetch('/api/extras')
      const json = await res.json()
      return json.data as { id: string; name: string; price: number; category: string }[]
    },
  })

  const [selectedExtras, setSelectedExtras] = useState<string[]>([])
  const [linkedProductId, setLinkedProductId] = useState<string>('none')
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>([])

  function openCreate() {
    const state = getCreateMenuEditorState()
    setEditing(state.editing)
    form.reset(state.formValues)
    setLinkedProductId(state.linkedProductId)
    setIngredients(state.ingredients)
    setSelectedExtras(state.selectedExtras)
    setOpen(true)
  }

  async function openEdit(item: MenuItem) {
    const res = await fetch(`/api/menu-items/${item.id}/extras`)
    const json = await res.json()

    let ingredientsState: Array<{ product_id: string; quantity: number }> = []

    if (hasStockAutomation) {
      const ingredientsRes = await fetch(`/api/menu-items/${item.id}/ingredients`)
      const ingredientsJson = await ingredientsRes.json()
      ingredientsState = ingredientsJson.data ?? []
    }

    const state = getMenuEditState({
      item,
      selectedExtras: json.data,
      ingredients: ingredientsState,
      hasStockAutomation,
    })

    setEditing(state.editing as MenuItem)
    form.reset(state.formValues)
    setSelectedExtras(state.selectedExtras)
    setIngredients(state.ingredients)
    setLinkedProductId(state.linkedProductId)
    setOpen(true)
  }

  async function onSubmit(values: MenuItemForm) {
    try {
      let menuItemId = editing?.id ?? null

      if (editing) {
        const payload = buildUpdateMenuItemPayload(
          values,
          hasStockAutomation,
          linkedProductId,
        )
        const res = await fetch(`/api/menu-items/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      } else {
        const payload = buildCreateMenuItemPayload(
          values,
          hasStockAutomation,
          linkedProductId,
        )
        const createdItem = await createMenuItem.mutateAsync(payload)
        menuItemId = createdItem.id
      }

      if (menuItemId) {
        await fetch(`/api/menu-items/${menuItemId}/extras`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extra_ids: selectedExtras }),
        })

        if (hasStockAutomation) {
          await fetch(`/api/menu-items/${menuItemId}/ingredients`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredients: getNormalizedIngredients(ingredients),
            }),
          })
        }
      }
      const successState = getMenuSubmitSuccessState()
      setOpen(successState.open)
      form.reset(successState.formValues)
      setSelectedExtras(successState.selectedExtras)
      setIngredients(successState.ingredients)
      setLinkedProductId(successState.linkedProductId)
    } catch (e: unknown) {
      form.setError('root', {
        message: getMenuSubmitErrorMessage(e),
      })
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    const availabilityState = buildMenuAvailabilityState(item)
    if (!confirm(availabilityState.confirmMessage)) return
    setDeletingId(item.id)
    try {
      const request = buildMenuAvailabilityRequest(item, availabilityState.nextAvailable)
      const res = await fetch(request.url, request.init)
      if (!res.ok) throw new Error()
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    } catch {
      alert(availabilityState.errorMessage)
    } finally {
      setDeletingId(null)
    }
  }

  function addIngredient() {
    setIngredients((current) => addMenuIngredient(current))
  }

  function updateIngredient(index: number, patch: Partial<MenuItemIngredient>) {
    setIngredients((current) => updateMenuIngredient(current, index, patch))
  }

  function removeIngredient(index: number) {
    setIngredients((current) => removeMenuIngredient(current, index))
  }

  return (
    <MenuDashboardPageContent
      availableCount={availableCount}
      inactiveCount={inactiveCount}
      limitLabel={limitLabel}
      menuItemLimitReached={menuItemLimitReached}
      onCreate={openCreate}
      planName={plan?.plan}
      menuItemLimit={plan?.resource_limits?.menu_items}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={(value) => {
        const nextState = getMenuFilterChangeState(value)
        setCategoryFilter(nextState.value)
        setPage(nextState.page)
      }}
      categories={categories}
      statusFilter={statusFilter}
      onStatusFilterChange={(value) => {
        const nextState = getMenuFilterChangeState(value)
        setStatusFilter(nextState.value)
        setPage(nextState.page)
      }}
      isLoading={isLoading}
      items={items}
      paginatedItems={paginatedItems}
      deletingId={deletingId}
      onEdit={openEdit}
      onToggleAvailable={handleToggleAvailable}
      page={page}
      totalPages={getMenuTotalPages(items.length, pageSize)}
      onPageChange={setPage}
      dialogProps={{
        open,
        onOpenChange: setOpen,
        editing,
        form,
        categories,
        hasStockAutomation,
        linkedProductId,
        onLinkedProductChange: setLinkedProductId,
        products,
        ingredients,
        onAddIngredient: addIngredient,
        onUpdateIngredient: updateIngredient,
        onRemoveIngredient: removeIngredient,
        allExtras,
        selectedExtras,
        onSelectedExtrasChange: setSelectedExtras,
        onSubmit,
      }}
    />
  )
}
