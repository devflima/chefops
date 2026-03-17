export type Category = {
  id: string
  tenant_id: string
  name: string
  display_order: number
  created_at: string
}

export type Product = {
  id: string
  tenant_id: string
  category_id: string | null
  name: string
  sku: string | null
  unit: 'un' | 'kg' | 'g' | 'l' | 'ml' | 'cx' | 'pct'
  cost_price: number
  min_stock: number
  active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export type ProductWithStock = Product & {
  current_stock: number
  is_low_stock: boolean
}

export type CreateProductPayload = {
  name: string
  sku?: string
  category_id?: string
  unit: Product['unit']
  cost_price: number
  min_stock: number
}

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  active?: boolean
}