export type MenuItem = {
  id: string
  tenant_id: string
  product_id: string | null
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  available: boolean
  display_order: number
  created_at: string
  category?: { id: string; name: string }
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'online' | 'table' | 'counter'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export type OrderItemExtra = {
  id: string
  order_item_id: string
  name: string
  price: number
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string | null
  name: string
  price: number
  quantity: number
  notes: string | null
  extras?: OrderItemExtra[]
}

export type Order = {
  id: string
  tenant_id: string
  order_number: number
  customer_name: string | null
  customer_phone: string | null
  table_number: string | null
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  subtotal: number
  total: number
  notes: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export type CartItem = {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  notes?: string
  extras?: { name: string; price: number }[]
}

export type CreateOrderPayload = {
  tenant_id: string
  customer_name?: string
  customer_cpf?: string
  customer_phone?: string
  table_number?: string
  table_id?: string
  payment_method: PaymentMethod
  notes?: string
  items: CartItem[]
}
