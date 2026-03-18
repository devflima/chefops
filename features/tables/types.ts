export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

export type Table = {
  id: string
  tenant_id: string
  number: string
  capacity: number
  status: TableStatus
  created_at: string
  updated_at: string
  active_session?: TableSession | null
}

export type TableSession = {
  id: string
  tenant_id: string
  table_id: string
  opened_by: string | null
  closed_by: string | null
  status: 'open' | 'closed'
  customer_count: number
  total: number
  opened_at: string
  closed_at: string | null
  orders?: import('@/features/orders/types').Order[]
}

export type TableQRCode = {
  id: string
  tenant_id: string
  table_id: string
  token: string
  created_at: string
}

export type CreateTablePayload = {
  number: string
  capacity: number
}

export type OpenSessionPayload = {
  table_id: string
  customer_count: number
}
