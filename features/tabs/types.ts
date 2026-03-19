export type TabStatus = 'open' | 'closed'

export type Tab = {
  id: string
  tenant_id: string
  label: string
  status: TabStatus
  notes: string | null
  opened_by: string | null
  closed_by: string | null
  total: number
  created_at: string
  closed_at: string | null
  orders?: {
    id: string
    total: number
    payment_status: 'pending' | 'paid' | 'refunded'
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  }[]
}

export type CreateTabPayload = {
  label: string
  notes?: string
}
