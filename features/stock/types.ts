import type { Product } from '@/features/products/types'

export type MovementType = 'entry' | 'exit' | 'loss' | 'adjustment'

export type StockMovement = {
  id: string
  tenant_id: string
  product_id: string
  user_id: string
  type: MovementType
  quantity: number
  reason: string | null
  created_at: string
  product?: Product
}

export type StockBalance = {
  product_id: string
  product_name: string
  unit: string
  current_stock: number
  min_stock: number
  is_low_stock: boolean
  category_name: string | null
}

export type StockSnapshot = {
  id: string
  tenant_id: string
  product_id: string
  quantity: number
  snapshot_date: string
  closed_at: string
  product?: Product
}

export type CreateMovementPayload = {
  product_id: string
  type: MovementType
  quantity: number
  reason?: string
}