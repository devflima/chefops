export type MenuCategoryOption = {
  id: string
  name: string
}

export function normalizeMenuCategoryName(name?: string | null) {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function isPizzaCategoryName(name?: string | null) {
  return normalizeMenuCategoryName(name).includes('pizza')
}

export function isPizzaCategoryId(
  categoryId?: string | null,
  categories?: MenuCategoryOption[]
) {
  if (!categoryId || categoryId === 'none') return false

  return isPizzaCategoryName(categories?.find((category) => category.id === categoryId)?.name)
}
