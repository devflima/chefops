import { describe, expect, it, vi } from 'vitest'

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
})
