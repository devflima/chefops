export type Extra = {
  id: string
  name: string
  price: number
  category: 'border' | 'flavor' | 'other'
}

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
  extras?: { extra: Extra }[]
  ingredients?: {
    id: string
    product_id: string
    quantity: number
    product?: {
      id: string
      name: string
      unit: string
    } | null
  }[]
}

export type CartExtra = {
  id: string
  name: string
  price: number
}

export type CartItem = {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  notes?: string
  extras?: { name: string; price: number }[]
  half_flavor?: {
    menu_item_id: string
    name: string
  }
}

export type CustomerAddress = {
  id?: string
  label: string
  zip_code: string
  street: string
  number: string
  complement?: string
  neighborhood?: string
  city: string
  state: string
  is_default: boolean
}

export type Customer = {
  id: string
  tenant_id: string
  name: string
  phone: string
  cpf?: string
  addresses?: CustomerAddress[]
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'online' | 'table' | 'counter' | 'delivery'
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
  customer_cpf: string | null
  customer_id: string | null
  table_number: string | null
  tab_id?: string | null
  tab?: {
    id: string
    label: string
    status: 'open' | 'closed'
  } | null
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_provider?: string | null
  payment_transaction_id?: string | null
  refunded_at?: string | null
  subtotal: number
  total: number
  notes: string | null
  cancelled_reason: string | null
  stock_deducted_at?: string | null
  notifications?: {
    id: string
    channel: 'whatsapp'
    event_key: string
    status: 'sent' | 'failed' | 'skipped'
    recipient: string | null
    error_message?: string | null
    created_at: string
  }[]
  delivery_address: CustomerAddress | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export type CreateOrderPayload = {
  tenant_id: string
  customer_name?: string
  customer_cpf?: string
  customer_phone?: string
  customer_id?: string
  table_number?: string
  table_id?: string
  tab_id?: string
  payment_method: PaymentMethod
  notes?: string
  delivery_address?: CustomerAddress
  items: CartItem[]
}
