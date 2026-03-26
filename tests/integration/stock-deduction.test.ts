import { describe, expect, it } from 'vitest'

import { deductOrderStockIfNeededWithAdmin } from '@/lib/stock-deduction'
import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

describe('stock deduction', () => {
  it('deductOrderStockIfNeededWithAdmin evita baixa duplicada', async () => {
    const admin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-1',
          tenant_id: 'tenant-1',
          order_number: 10,
          stock_deducted_at: '2026-03-20T10:00:00.000Z',
          items: [],
        },
        error: null,
      }),
    })

    const result = await deductOrderStockIfNeededWithAdmin(admin as never, 'order-1', 'user-1')

    expect(result).toEqual({
      deducted: false,
      reason: 'already-deducted',
    })
  })

  it('deductOrderStockIfNeededWithAdmin grava movimentações com ficha técnica e fallback por product_id', async () => {
    let insertedRows: unknown[] | undefined
    let updatedOrderValues: Record<string, unknown> | undefined

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              order_number: 101,
              stock_deducted_at: null,
              items: [
                { id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 2 },
                { id: 'item-2', menu_item_id: 'menu-2', name: 'Refri', quantity: 3 },
              ],
            },
            error: null,
          }
        }

        updatedOrderValues = state.values
        return { data: null, error: null }
      },
      menu_items: () => ({
        data: [
          { id: 'menu-1', name: 'Pizza', product_id: null },
          { id: 'menu-2', name: 'Refri', product_id: 'prod-2' },
        ],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [
          { menu_item_id: 'menu-1', product_id: 'prod-1', quantity: 0.5 },
        ],
        error: null,
      }),
      stock_balance: () => ({
        data: [
          { product_id: 'prod-1', current_stock: 10 },
          { product_id: 'prod-2', current_stock: 10 },
        ],
        error: null,
      }),
      stock_movements: (state) => {
        insertedRows = state.rows
        return { data: null, error: null }
      },
    })

    const result = await deductOrderStockIfNeededWithAdmin(admin as never, 'order-1', 'user-1')

    expect(result).toEqual({ deducted: true })
    expect(insertedRows).toEqual([
      {
        tenant_id: 'tenant-1',
        product_id: 'prod-1',
        user_id: 'user-1',
        type: 'exit',
        quantity: 1,
        reason: 'Baixa automática do pedido #101',
      },
      {
        tenant_id: 'tenant-1',
        product_id: 'prod-2',
        user_id: 'user-1',
        type: 'exit',
        quantity: 3,
        reason: 'Baixa automática do pedido #101',
      },
    ])
    expect(typeof updatedOrderValues?.stock_deducted_at).toBe('string')
  })

  it('deductOrderStockIfNeededWithAdmin falha quando o saldo é insuficiente', async () => {
    const admin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-1',
          tenant_id: 'tenant-1',
          order_number: 55,
          stock_deducted_at: null,
          items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 2 }],
        },
        error: null,
      }),
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: null }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [{ menu_item_id: 'menu-1', product_id: 'prod-1', quantity: 2 }],
        error: null,
      }),
      stock_balance: () => ({
        data: [{ product_id: 'prod-1', current_stock: 1 }],
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(admin as never, 'order-1', 'user-1')
    ).rejects.toThrow(/Saldo insuficiente/)
  })

  it('deductOrderStockIfNeededWithAdmin cobre pedido ausente, sem itens, sem produtos vinculados e erro de update final', async () => {
    const missingOrderAdmin = createMockSupabaseClient({
      orders: () => ({
        data: null,
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(missingOrderAdmin as never, 'missing', 'user-1')
    ).rejects.toThrow(/Pedido não encontrado/)

    let noItemsUpdate: Record<string, unknown> | undefined
    const noItemsAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-2',
              tenant_id: 'tenant-1',
              order_number: 22,
              stock_deducted_at: null,
              items: [],
            },
            error: null,
          }
        }

        noItemsUpdate = state.values
        return { data: null, error: null }
      },
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(noItemsAdmin as never, 'order-2', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-menu-items',
    })
    expect(noItemsUpdate).toHaveProperty('stock_deducted_at')

    let noLinkedUpdate: Record<string, unknown> | undefined
    const noLinkedAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-3',
              tenant_id: 'tenant-1',
              order_number: 33,
              stock_deducted_at: null,
              items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
            },
            error: null,
          }
        }

        noLinkedUpdate = state.values
        return { data: null, error: null }
      },
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: null }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(noLinkedAdmin as never, 'order-3', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-linked-products',
    })
    expect(noLinkedUpdate).toHaveProperty('stock_deducted_at')

    const updateErrorAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-4',
              tenant_id: 'tenant-1',
              order_number: 44,
              stock_deducted_at: null,
              items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
            },
            error: null,
          }
        }

        return { data: null, error: new Error('order update failed') }
      },
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
      stock_balance: () => ({
        data: [{ product_id: 'prod-1', current_stock: 5 }],
        error: null,
      }),
      stock_movements: () => ({
        data: null,
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(updateErrorAdmin as never, 'order-4', 'user-1')
    ).rejects.toThrow('order update failed')
  })

  it('deductOrderStockIfNeededWithAdmin cobre erros intermediários de leitura e insert', async () => {
    const menuItemsErrorAdmin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-5',
          tenant_id: 'tenant-1',
          order_number: 55,
          stock_deducted_at: null,
          items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
        },
        error: null,
      }),
      menu_items: () => ({
        data: null,
        error: new Error('menu items failed'),
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(menuItemsErrorAdmin as never, 'order-5', 'user-1')
    ).rejects.toThrow('menu items failed')

    const recipeErrorAdmin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-6',
          tenant_id: 'tenant-1',
          order_number: 66,
          stock_deducted_at: null,
          items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
        },
        error: null,
      }),
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: null,
        error: new Error('recipe failed'),
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(recipeErrorAdmin as never, 'order-6', 'user-1')
    ).rejects.toThrow('recipe failed')

    const balanceErrorAdmin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-7',
          tenant_id: 'tenant-1',
          order_number: 77,
          stock_deducted_at: null,
          items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
        },
        error: null,
      }),
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
      stock_balance: () => ({
        data: null,
        error: new Error('balance failed'),
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(balanceErrorAdmin as never, 'order-7', 'user-1')
    ).rejects.toThrow('balance failed')

    const insertErrorAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-8',
              tenant_id: 'tenant-1',
              order_number: 88,
              stock_deducted_at: null,
              items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
            },
            error: null,
          }
        }

        return { data: null, error: null }
      },
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
      stock_balance: () => ({
        data: [{ product_id: 'prod-1', current_stock: 5 }],
        error: null,
      }),
      stock_movements: () => ({
        data: null,
        error: new Error('insert failed'),
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(insertErrorAdmin as never, 'order-8', 'user-1')
    ).rejects.toThrow('insert failed')
  })

  it('deductOrderStockIfNeededWithAdmin ignora itens sem menu_item_id e usa saldo zero como fallback', async () => {
    const admin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-9',
          tenant_id: 'tenant-1',
          order_number: 99,
          stock_deducted_at: null,
          items: [
            { id: 'item-ignored', menu_item_id: null, name: 'Manual', quantity: 2 },
            { id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 },
          ],
        },
        error: null,
      }),
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
      stock_balance: () => ({
        data: [],
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(admin as never, 'order-9', 'user-1')
    ).rejects.toThrow(/Saldo insuficiente/)
  })

  it('deductOrderStockIfNeededWithAdmin usa fallbacks nulos para items, menuItems, recipeRows e balances', async () => {
    let noItemsUpdate: Record<string, unknown> | undefined
    const noItemsAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-10',
              tenant_id: 'tenant-1',
              order_number: 100,
              stock_deducted_at: null,
              items: null,
            },
            error: null,
          }
        }

        noItemsUpdate = state.values
        return { data: null, error: null }
      },
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(noItemsAdmin as never, 'order-10', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-menu-items',
    })
    expect(noItemsUpdate).toHaveProperty('stock_deducted_at')

    let noLinkedUpdate: Record<string, unknown> | undefined
    const noLinkedAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-11',
              tenant_id: 'tenant-1',
              order_number: 111,
              stock_deducted_at: null,
              items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
            },
            error: null,
          }
        }

        noLinkedUpdate = state.values
        return { data: null, error: null }
      },
      menu_items: () => ({
        data: null,
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: null,
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(noLinkedAdmin as never, 'order-11', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-linked-products',
    })
    expect(noLinkedUpdate).toHaveProperty('stock_deducted_at')

    const noBalancesAdmin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-12',
          tenant_id: 'tenant-1',
          order_number: 122,
          stock_deducted_at: null,
          items: [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }],
        },
        error: null,
      }),
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
      stock_balance: () => ({
        data: null,
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(noBalancesAdmin as never, 'order-12', 'user-1')
    ).rejects.toThrow(/Saldo insuficiente/)
  })

  it('deductOrderStockIfNeededWithAdmin trata order.items indefinido como lista vazia', async () => {
    let updatedOrderValues: Record<string, unknown> | undefined

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-13',
              tenant_id: 'tenant-1',
              order_number: 133,
              stock_deducted_at: null,
              items: undefined,
            },
            error: null,
          }
        }

        updatedOrderValues = state.values
        return { data: null, error: null }
      },
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(admin as never, 'order-13', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-menu-items',
    })

    expect(updatedOrderValues).toHaveProperty('stock_deducted_at')
  })

  it('deductOrderStockIfNeededWithAdmin trata order.items nulo como lista vazia', async () => {
    let updatedOrderValues: Record<string, unknown> | undefined

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-14',
              tenant_id: 'tenant-1',
              order_number: 144,
              stock_deducted_at: null,
              items: null,
            },
            error: null,
          }
        }

        updatedOrderValues = state.values
        return { data: null, error: null }
      },
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(admin as never, 'order-14', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-menu-items',
    })

    expect(updatedOrderValues).toHaveProperty('stock_deducted_at')
  })

  it('deductOrderStockIfNeededWithAdmin usa o fallback da segunda leitura de order.items', async () => {
    let updatedOrderValues: Record<string, unknown> | undefined
    let itemsReadCount = 0

    const order = {
      id: 'order-15',
      tenant_id: 'tenant-1',
      order_number: 155,
      stock_deducted_at: null,
    } as Record<string, unknown>

    Object.defineProperty(order, 'items', {
      enumerable: true,
      get: () => {
        itemsReadCount += 1
        if (itemsReadCount === 1) {
          return [{ id: 'item-1', menu_item_id: 'menu-1', name: 'Pizza', quantity: 1 }]
        }

        return undefined
      },
    })

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: order,
            error: null,
          }
        }

        updatedOrderValues = state.values
        return { data: null, error: null }
      },
      menu_items: () => ({
        data: [{ id: 'menu-1', name: 'Pizza', product_id: 'prod-1' }],
        error: null,
      }),
      menu_item_ingredients: () => ({
        data: [],
        error: null,
      }),
    })

    await expect(
      deductOrderStockIfNeededWithAdmin(admin as never, 'order-15', 'user-1')
    ).resolves.toEqual({
      deducted: false,
      reason: 'no-linked-products',
    })

    expect(itemsReadCount).toBeGreaterThanOrEqual(2)
    expect(updatedOrderValues).toHaveProperty('stock_deducted_at')
  })
})
