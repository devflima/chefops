import type { MenuItem } from '@/features/orders/types'

export type MenuItemIngredient = {
  product_id: string
  quantity: number
}

export function filterMenuItems(
  items: MenuItem[],
  statusFilter: 'all' | 'available' | 'inactive',
  categoryFilter: string
) {
  return items.filter((item) => {
    if (statusFilter === 'available' && !item.available) return false
    if (statusFilter === 'inactive' && item.available) return false
    if (categoryFilter !== 'all' && item.category_id !== categoryFilter) return false
    return true
  })
}

export function getInactiveCount(items: MenuItem[] | undefined) {
  return items?.filter((item) => !item.available).length ?? 0
}

export function paginateMenuItems(items: MenuItem[], page: number, pageSize: number) {
  return items.slice((page - 1) * pageSize, page * pageSize)
}

export function buildMenuPageSummary(
  allItems: MenuItem[] | undefined,
  plan?: { plan?: string; resource_limits?: { menu_items: number } } | null
) {
  const availableCount = allItems?.filter((item) => item.available).length ?? 0
  const inactiveCount = getInactiveCount(allItems)
  const menuItemCount = allItems?.length ?? 0

  return {
    availableCount,
    inactiveCount,
    menuItemCount,
    limitLabel:
      plan?.resource_limits?.menu_items !== -1
        ? `${menuItemCount}/${plan?.resource_limits?.menu_items} no plano`
        : '',
  }
}

export function getInitialMenuItemFormValues() {
  return { name: '', description: '', price: 0, display_order: 0 }
}

export function getMenuDialogTitle(editing: Pick<MenuItem, 'id'> | null) {
  return editing ? 'Editar item' : 'Novo item do cardápio'
}

export function getCreateMenuEditorState() {
  return {
    editing: null,
    formValues: getInitialMenuItemFormValues(),
    linkedProductId: 'none',
    ingredients: [] as MenuItemIngredient[],
    selectedExtras: [] as string[],
  }
}

export function getMenuEditState(params: {
  item: Pick<MenuItem, 'id' | 'name' | 'description' | 'price' | 'category_id' | 'display_order' | 'product_id'>
  selectedExtras?: Array<{ id: string }> | null
  ingredients?: Array<{ product_id: string; quantity: number }> | null
  hasStockAutomation: boolean
}) {
  return {
    editing: params.item,
    formValues: {
      name: params.item.name,
      description: params.item.description ?? '',
      price: params.item.price,
      category_id: params.item.category_id ?? '',
      display_order: params.item.display_order,
    },
    selectedExtras: (params.selectedExtras ?? []).map((extra) => extra.id),
    ingredients: params.hasStockAutomation
      ? (params.ingredients ?? []).map((ingredient) => ({
          product_id: ingredient.product_id,
          quantity: Number(ingredient.quantity),
        }))
      : [],
    linkedProductId: params.hasStockAutomation ? params.item.product_id ?? 'none' : 'none',
  }
}

export function getMenuSubmitSuccessState() {
  return {
    open: false,
    formValues: getInitialMenuItemFormValues(),
    selectedExtras: [] as string[],
    ingredients: [] as MenuItemIngredient[],
    linkedProductId: 'none',
  }
}

export function getMenuTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function buildMenuItemPayload(
  values: { name: string; description?: string; price: number; category_id?: string; display_order: number },
  hasStockAutomation: boolean,
  linkedProductId: string
) {
  return {
    ...values,
    product_id: hasStockAutomation && linkedProductId !== 'none' ? linkedProductId : null,
  }
}

export function getNormalizedIngredients(
  ingredients: Array<{ product_id: string; quantity: number }>
) {
  return ingredients.filter((ingredient) => ingredient.product_id !== 'none')
}

export function addMenuIngredient(
  ingredients: Array<{ product_id: string; quantity: number }>
) {
  return [...ingredients, { product_id: 'none', quantity: 1 }]
}

export function updateMenuIngredient(
  ingredients: Array<{ product_id: string; quantity: number }>,
  index: number,
  patch: Partial<{ product_id: string; quantity: number }>
) {
  return ingredients.map((ingredient, ingredientIndex) =>
    ingredientIndex === index ? { ...ingredient, ...patch } : ingredient
  )
}

export function removeMenuIngredient(
  ingredients: Array<{ product_id: string; quantity: number }>,
  index: number
) {
  return ingredients.filter((_, ingredientIndex) => ingredientIndex !== index)
}

export function toggleMenuExtraSelection(selectedExtras: string[], extraId: string, checked: boolean) {
  return checked ? [...selectedExtras, extraId] : selectedExtras.filter((id) => id !== extraId)
}

export type MenuExtraOption = {
  id: string
  name: string
  price: number
  category: string
}

const MENU_EXTRA_CATEGORY_ORDER = ['border', 'flavor', 'other'] as const

export function getMenuExtraCategoryLabel(category: string) {
  if (category === 'border') return 'Borda'
  if (category === 'flavor') return 'Sabor extra'
  if (category === 'other') return 'Outros'

  return category
}

export function groupMenuExtrasByCategory(allExtras: MenuExtraOption[]) {
  const grouped = new Map<string, MenuExtraOption[]>()

  for (const extra of allExtras) {
    grouped.set(extra.category, [...(grouped.get(extra.category) ?? []), extra])
  }

  const knownCategories = MENU_EXTRA_CATEGORY_ORDER.filter((category) => grouped.has(category))
  const unknownCategories = [...grouped.keys()].filter((category) => !MENU_EXTRA_CATEGORY_ORDER.includes(category as (typeof MENU_EXTRA_CATEGORY_ORDER)[number]))

  return [...knownCategories, ...unknownCategories].map((category) => ({
    category,
    label: getMenuExtraCategoryLabel(category),
    extras: grouped.get(category) ?? [],
  }))
}

export function buildMenuAvailabilityState(item: Pick<MenuItem, 'available' | 'name'>) {
  const action = item.available ? 'desativar' : 'reativar'
  return {
    action,
    nextAvailable: !item.available,
    confirmMessage: `Deseja ${action} "${item.name}"?`,
    errorMessage: `Erro ao ${action} item.`,
  }
}

export function getMenuFilterChangeState<TValue>(value: TValue) {
  return {
    value,
    page: 1,
  }
}

export function getMenuSubmitErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao salvar item.'
}

export function buildMenuAvailabilityRequest(
  item: Pick<MenuItem, 'id'>,
  nextAvailable: boolean
) {
  return {
    url: `/api/menu-items/${item.id}`,
    init: {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: nextAvailable }),
    },
  }
}
