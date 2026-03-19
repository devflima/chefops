import { createAdminClient } from '@/lib/supabase/admin'

type IngredientRow = {
  product_id: string
  quantity: number
}

export async function deductOrderStockIfNeeded(orderId: string, userId: string) {
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, tenant_id, order_number, stock_deducted_at, items:order_items(id, menu_item_id, name, quantity)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw orderError ?? new Error('Pedido não encontrado para baixa de estoque.')
  }

  if (order.stock_deducted_at) {
    return { deducted: false, reason: 'already-deducted' as const }
  }

  const menuItemIds = (order.items ?? [])
    .map((item) => item.menu_item_id)
    .filter((value): value is string => Boolean(value))

  if (menuItemIds.length === 0) {
    await admin
      .from('orders')
      .update({ stock_deducted_at: new Date().toISOString() })
      .eq('id', order.id)

    return { deducted: false, reason: 'no-menu-items' as const }
  }

  const { data: menuItems, error: menuItemsError } = await admin
    .from('menu_items')
    .select('id, name, product_id')
    .in('id', menuItemIds)

  if (menuItemsError) throw menuItemsError

  const { data: recipeRows, error: recipeError } = await admin
    .from('menu_item_ingredients')
    .select('menu_item_id, product_id, quantity')
    .in('menu_item_id', menuItemIds)

  if (recipeError) throw recipeError

  const menuItemsById = new Map((menuItems ?? []).map((item) => [item.id, item]))
  const recipeByMenuItem = new Map<string, IngredientRow[]>()

  for (const row of recipeRows ?? []) {
    const current = recipeByMenuItem.get(row.menu_item_id) ?? []
    current.push({
      product_id: row.product_id,
      quantity: Number(row.quantity),
    })
    recipeByMenuItem.set(row.menu_item_id, current)
  }

  const deductions = new Map<string, number>()

  for (const item of order.items ?? []) {
    if (!item.menu_item_id) continue

    const recipe = recipeByMenuItem.get(item.menu_item_id)
    const quantity = Number(item.quantity)

    if (recipe && recipe.length > 0) {
      for (const ingredient of recipe) {
        deductions.set(
          ingredient.product_id,
          (deductions.get(ingredient.product_id) ?? 0) + ingredient.quantity * quantity
        )
      }
      continue
    }

    const menuItem = menuItemsById.get(item.menu_item_id)
    if (menuItem?.product_id) {
      deductions.set(
        menuItem.product_id,
        (deductions.get(menuItem.product_id) ?? 0) + quantity
      )
    }
  }

  if (deductions.size === 0) {
    await admin
      .from('orders')
      .update({ stock_deducted_at: new Date().toISOString() })
      .eq('id', order.id)

    return { deducted: false, reason: 'no-linked-products' as const }
  }

  const productIds = Array.from(deductions.keys())
  const { data: balances, error: balanceError } = await admin
    .from('stock_balance')
    .select('product_id, current_stock')
    .eq('tenant_id', order.tenant_id)
    .in('product_id', productIds)

  if (balanceError) throw balanceError

  const balanceByProduct = new Map(
    (balances ?? []).map((balance) => [balance.product_id, Number(balance.current_stock)])
  )

  for (const [productId, quantity] of deductions.entries()) {
    const currentStock = balanceByProduct.get(productId) ?? 0
    if (currentStock < quantity) {
      throw new Error('Saldo insuficiente para realizar a baixa automática deste pedido.')
    }
  }

  const movementRows = Array.from(deductions.entries()).map(([product_id, quantity]) => ({
    tenant_id: order.tenant_id,
    product_id,
    user_id: userId,
    type: 'exit',
    quantity,
    reason: `Baixa automática do pedido #${order.order_number}`,
  }))

  const { error: insertError } = await admin
    .from('stock_movements')
    .insert(movementRows)

  if (insertError) throw insertError

  const { error: updateError } = await admin
    .from('orders')
    .update({ stock_deducted_at: new Date().toISOString() })
    .eq('id', order.id)

  if (updateError) throw updateError

  return { deducted: true }
}
